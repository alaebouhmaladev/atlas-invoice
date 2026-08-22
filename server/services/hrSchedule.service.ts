import { ScheduleStatus, ScheduledShiftStatus, ShiftSegmentType, AvailabilityStatus } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import { calculateSegmentMinutes } from './hrShiftTemplate.service'
import type { UserPublic } from '~/types/auth'
import { parseHrLocalDate } from '../utils/hrDates'

export interface ShiftSegmentInput {
  order: number
  startLocalTime: string
  endLocalTime: string
  endsNextDay?: boolean
  segmentType?: ShiftSegmentType
}

export interface CreateScheduledShiftInput {
  scheduleId: string
  employeeId: string
  siteId: string
  positionId: string
  workDate: string // "YYYY-MM-DD"
  templateId?: string | null
  notes?: string | null
  segments: ShiftSegmentInput[]
  overrideWarnings?: boolean
}

export interface UpdateScheduledShiftInput {
  positionId?: string
  workDate?: string
  templateId?: string | null
  notes?: string | null
  segments?: ShiftSegmentInput[]
  overrideWarnings?: boolean
}

export interface ScheduleConflict {
  type: 'BLOCKING' | 'WARNING'
  code: string
  message: string
  shiftId?: string
  employeeId?: string
  workDate?: string
}

export interface StaffingCoverageResult {
  siteId: string
  date: string
  dayOfWeek: number
  positionId: string
  positionTitle: string
  startLocalTime: string
  endLocalTime: string
  minRequired: number
  actualCount: number
  status: 'COMPLETE' | 'UNDERSTAFFED' | 'OVERSTAFFED'
}

/**
 * Gets start and end of week (Monday 00:00:00 to Sunday 23:59:59) for a given date.
 */
export function getWeekPeriodBoundaries(dInput: string | Date): { periodStart: Date; periodEnd: Date } {
  const d = new Date(dInput)
  const day = d.getUTCDay()
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  
  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() + diffToMonday)
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)

  return { periodStart: monday, periodEnd: sunday }
}

/**
 * Helper to compute UTC Date range for a local segment.
 */
export function computeSegmentUtcTimes(workDate: Date, startLocal: string, endLocal: string, endsNextDay = false): { startUtc: Date; endUtc: Date } {
  const [sH, sM] = startLocal.split(':').map(Number)
  const [eH, eM] = endLocal.split(':').map(Number)

  const startUtc = new Date(workDate)
  startUtc.setUTCHours(sH, sM, 0, 0)

  const endUtc = new Date(workDate)
  if (endsNextDay || (eH * 60 + eM <= sH * 60 + sM)) {
    endUtc.setUTCDate(endUtc.getUTCDate() + 1)
  }
  endUtc.setUTCHours(eH, eM, 0, 0)

  return { startUtc, endUtc }
}

/**
 * Verifies employee eligibility for a given site and date based on historical assignments.
 */
export async function verifyEmployeeEligibility(
  employeeId: string,
  siteId: string,
  workDate: Date,
  tenantId: string,
  shiftEndUtc?: Date
): Promise<{ isEligible: boolean; reason?: string; assignmentId?: string }> {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId, archivedAt: null }
  })
  if (!employee) {
    return { isEligible: false, reason: 'Employé introuvable ou archivé.' }
  }

  // Active or onboarding status required
  if (employee.employmentStatus === 'DEPARTED' || employee.employmentStatus === 'SUSPENDED') {
    return { isEligible: false, reason: `L'employé est actuellement en statut ${employee.employmentStatus}.` }
  }

  const startInterval = workDate
  const endInterval = shiftEndUtc || workDate

  if (employee.departureDate && employee.departureDate < endInterval) {
    return { isEligible: false, reason: `Le contrat de l'employé se termine pendant le shift.` }
  }

  // Check assignment covering the ENTIRE shift interval [startInterval, endInterval]
  const assignment = await prisma.employeeAssignment.findFirst({
    where: {
      tenantId,
      employeeId,
      siteId,
      startDate: { lte: startInterval },
      OR: [
        { endDate: null },
        { endDate: { gte: endInterval } }
      ]
    },
    orderBy: { isPrimary: 'desc' }
  })

  if (!assignment) {
    return { isEligible: false, reason: `L'employé n'a pas d'affectation valide couvrant l'intégralité du créneau (${startInterval.toISOString().slice(0, 10)} - ${endInterval.toISOString().slice(0, 10)}).` }
  }

  return { isEligible: true, assignmentId: assignment.id }
}

/**
 * Conflict detection engine for a scheduled shift.
 */
export async function detectShiftConflicts(
  tenantId: string,
  employeeId: string,
  siteId: string,
  workDate: Date,
  segments: ShiftSegmentInput[],
  excludeShiftId?: string,
  txClient: any = prisma
): Promise<ScheduleConflict[]> {
  const dbClient = txClient || prisma
  const conflicts: ScheduleConflict[] = []
  const dateStr = workDate.toISOString().slice(0, 10)
  const normalizedDate = parseHrLocalDate(dateStr)

  // Calculate UTC times for proposed shift segments
  const proposedTimes = segments
    .filter(s => s.segmentType !== 'UNPAID_BREAK')
    .map(s => computeSegmentUtcTimes(workDate, s.startLocalTime, s.endLocalTime, s.endsNextDay))

  const maxEndUtc = proposedTimes.length > 0
    ? new Date(Math.max(...proposedTimes.map(t => t.endUtc.getTime())))
    : workDate

  // 1. Eligibility Check across total shift interval [workDate, maxEndUtc]
  const eligibility = await verifyEmployeeEligibility(employeeId, siteId, workDate, tenantId, maxEndUtc)
  if (!eligibility.isEligible) {
    conflicts.push({
      type: 'BLOCKING',
      code: 'INELIGIBLE_EMPLOYEE',
      message: eligibility.reason || 'Employé non éligible sur ce site à cette date.',
      employeeId,
      workDate: dateStr
    })
  }

  if (proposedTimes.length === 0) return conflicts

  // Approved leave is a blocking planning fact. It never mutates an existing shift.
  const approvedLeave = await dbClient.leaveRequestDay.findFirst({
    where: {
      tenantId,
      localDate: normalizedDate,
      isWorkingDay: true,
      requestedMinutes: { gt: 0 },
      leaveRequest: { employeeId, status: 'APPROVED' }
    },
    include: { leaveRequest: { include: { leaveType: { select: { name: true } } } } }
  })
  if (approvedLeave) {
    conflicts.push({
      type: 'BLOCKING',
      code: 'APPROVED_LEAVE',
      message: `L’employé dispose d’une absence approuvée (${approvedLeave.leaveRequest.leaveType.name}) à cette date.`,
      employeeId,
      workDate: dateStr
    })
  }

  const calendarSite = await dbClient.holidayCalendarSite.findFirst({
    where: { tenantId, siteId },
    select: { calendarId: true }
  })
  const holiday = await dbClient.holiday.findFirst({
    where: {
      tenantId,
      localDate: normalizedDate,
      isWorkingDay: false,
      OR: [
        ...(calendarSite ? [{ calendarId: calendarSite.calendarId }] : []),
        { calendar: { isDefault: true, isActive: true } }
      ]
    }
  })
  if (holiday) {
    conflicts.push({
      type: 'WARNING',
      code: 'SITE_HOLIDAY',
      message: `Le ${dateStr} est configuré comme jour férié (${holiday.name}).`,
      employeeId,
      workDate: dateStr
    })
  }

  // 2. Double-booking check across all sites for this employee on overlapping dates
  const dayBefore = new Date(workDate)
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1)
  const dayAfter = new Date(workDate)
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1)

  const existingShifts = await dbClient.scheduledShift.findMany({
    where: {
      tenantId,
      employeeId,
      workDate: { gte: dayBefore, lte: dayAfter },
      status: { in: [ScheduledShiftStatus.PLANNED, ScheduledShiftStatus.PUBLISHED, ScheduledShiftStatus.CHANGED] },
      ...(excludeShiftId ? { id: { not: excludeShiftId } } : {})
    },
    include: { segments: true, site: true }
  })

  for (const existing of existingShifts) {
    for (const exSeg of existing.segments) {
      if (exSeg.segmentType === 'UNPAID_BREAK') continue

      for (const prop of proposedTimes) {
        if (Math.max(prop.startUtc.getTime(), exSeg.startUtc.getTime()) < Math.min(prop.endUtc.getTime(), exSeg.endUtc.getTime())) {
          conflicts.push({
            type: 'BLOCKING',
            code: 'SHIFT_OVERLAP',
            message: `L'employé est déjà planifié sur le site "${existing.site.name}" de ${exSeg.startLocalTime} à ${exSeg.endLocalTime}.`,
            shiftId: existing.id,
            employeeId,
            workDate: dateStr
          })
        }
      }
    }
  }

  // 3. Unavailability Warning Check
  const availabilities = await prisma.employeeAvailability.findMany({
    where: {
      tenantId,
      employeeId,
      status: AvailabilityStatus.UNAVAILABLE,
      effectiveFrom: { lte: workDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: workDate } }
      ]
    }
  })

  const dayOfWeek = workDate.getUTCDay()
  for (const avail of availabilities) {
    let match = false
    if (avail.specificDate && avail.specificDate.toISOString().slice(0, 10) === dateStr) {
      match = true
    } else if (avail.dayOfWeek !== null && avail.dayOfWeek === dayOfWeek) {
      match = true
    }

    if (match) {
      conflicts.push({
        type: 'WARNING',
        code: 'EMPLOYEE_UNAVAILABLE',
        message: `Indisponibilité déclarée par l'employé (${avail.reason || 'Sans motif'}). Ceci n’est pas une demande de congé approuvée.`,
        employeeId,
        workDate: dateStr
      })
    }
  }

  // 4. Policy Warnings (Daily minutes, minimum rest period)
  const policy = await prisma.siteSchedulePolicy.findFirst({ where: { tenantId, siteId } })
  const maxDailyMins = policy?.maximumDailyMinutes || 600 // 10h default

  let totalDailyMins = segments
    .filter(s => s.segmentType !== 'UNPAID_BREAK')
    .reduce((acc, s) => acc + calculateSegmentMinutes(s.startLocalTime, s.endLocalTime, s.endsNextDay), 0)

  if (totalDailyMins > maxDailyMins) {
    conflicts.push({
      type: 'WARNING',
      code: 'EXCESSIVE_DAILY_HOURS',
      message: `La durée totale du shift (${Math.round(totalDailyMins / 60)}h) dépasse la politique du site (${Math.round(maxDailyMins / 60)}h).`,
      employeeId,
      workDate: dateStr
    })
  }

  return conflicts
}

export async function getOrCreateWorkSchedule(siteId: string, periodStartInput: string | Date, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const { periodStart, periodEnd } = getWeekPeriodBoundaries(periodStartInput)

  const site = await prisma.workSite.findFirst({
    where: { id: siteId, tenantId, archivedAt: null }
  })
  if (!site) {
    throw new Error('Site introuvable ou archivé.')
  }

  let schedule = await prisma.workSchedule.findFirst({
    where: { tenantId, siteId, periodStart },
    include: {
      shifts: {
        include: {
          employee: true,
          position: true,
          segments: { orderBy: { order: 'asc' } }
        },
        orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }]
      }
    }
  })

  if (!schedule) {
    schedule = await prisma.workSchedule.create({
      data: {
        tenantId,
        siteId,
        periodStart,
        periodEnd,
        status: ScheduleStatus.DRAFT,
        createdByUserId: actor.id
      },
      include: {
        shifts: {
          include: {
            employee: true,
            position: true,
            segments: { orderBy: { order: 'asc' } }
          },
          orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }]
        }
      }
    })

    await createAuditEntry({
      userId: actor.id,
      action: 'HR_SCHEDULE_CREATED',
      category: 'HR_SCHEDULE',
      result: 'SUCCESS',
      entityType: 'WorkSchedule',
      entityId: schedule.id,
      entityReference: site.name,
      metadata: { siteId, periodStart: periodStart.toISOString() }
    })
  }

  return schedule
}

export async function createScheduledShift(input: CreateScheduledShiftInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const workDate = parseHrLocalDate(input.workDate)

  const schedule = await prisma.workSchedule.findFirst({
    where: { id: input.scheduleId, tenantId }
  })
  if (!schedule) throw new Error('Planning introuvable.')

  if (schedule.status === ScheduleStatus.LOCKED || schedule.status === ScheduleStatus.ARCHIVED) {
    throw new Error('Impossible de modifier un planning verrouillé ou archivé.')
  }

  const shift = await prisma.$transaction(async (tx) => {
    // Acquire PostgreSQL advisory lock on employee ID to prevent concurrent shift race conditions
    try {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', input.employeeId)
    } catch {
      // Non-PostgreSQL fallback
    }

    // Validate shift conflicts inside locked transaction
    const conflicts = await detectShiftConflicts(tenantId, input.employeeId, input.siteId, workDate, input.segments, undefined, tx)
    const blocking = conflicts.filter(c => c.type === 'BLOCKING')
    if (blocking.length > 0) {
      throw new Error(`Conflit bloquant : ${blocking.map(b => b.message).join(' | ')}`)
    }

    const warnings = conflicts.filter(c => c.type === 'WARNING')
    if (warnings.length > 0 && !input.overrideWarnings) {
      const err: any = new Error('Des avertissements de planning nécessitent votre confirmation.')
      err.statusCode = 400
      err.data = { code: 'SCHEDULE_WARNING', conflicts: warnings }
      throw err
    }

    // Calculate work minutes
    let totalWorkMinutes = 0
    for (const seg of input.segments) {
      if (seg.segmentType !== 'UNPAID_BREAK') {
        totalWorkMinutes += calculateSegmentMinutes(seg.startLocalTime, seg.endLocalTime, seg.endsNextDay)
      }
    }

    // Fetch optional template snapshot details
    let templateNameSnapshot: string | null = null
    let templateColorSnapshot: string | null = null
    if (input.templateId) {
      const tmpl = await tx.shiftTemplate.findFirst({ where: { id: input.templateId, tenantId } })
      if (tmpl) {
        templateNameSnapshot = tmpl.name
        templateColorSnapshot = tmpl.color
      }
    }

    const eligibility = await verifyEmployeeEligibility(input.employeeId, input.siteId, workDate, tenantId)

    const s = await tx.scheduledShift.create({
      data: {
        tenantId,
        scheduleId: input.scheduleId,
        employeeId: input.employeeId,
        siteId: input.siteId,
        positionId: input.positionId,
        assignmentId: eligibility.assignmentId || null,
        workDate,
        status: schedule.status === ScheduleStatus.PUBLISHED ? ScheduledShiftStatus.PUBLISHED : ScheduledShiftStatus.PLANNED,
        templateId: input.templateId || null,
        templateNameSnapshot,
        templateColorSnapshot,
        totalWorkMinutes,
        notes: input.notes || null,
        createdByUserId: actor.id
      }
    })

    await tx.scheduledShiftSegment.createMany({
      data: input.segments.map((seg, idx) => {
        const utcTimes = computeSegmentUtcTimes(workDate, seg.startLocalTime, seg.endLocalTime, seg.endsNextDay)
        return {
          shiftId: s.id,
          order: seg.order || idx + 1,
          startLocalTime: seg.startLocalTime,
          endLocalTime: seg.endLocalTime,
          endsNextDay: seg.endsNextDay ?? false,
          segmentType: seg.segmentType || ShiftSegmentType.WORK,
          startUtc: utcTimes.startUtc,
          endUtc: utcTimes.endUtc
        }
      })
    })

    return tx.scheduledShift.findUnique({
      where: { id: s.id },
      include: { employee: true, position: true, segments: { orderBy: { order: 'asc' } } }
    })
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SHIFT_CREATED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'ScheduledShift',
    entityId: shift?.id,
    entityReference: `${shift?.employee.firstName} ${shift?.employee.lastName}`
  })

  return shift
}

export async function copyPreviousWeek(
  siteId: string,
  sourcePeriodStartInput: string | Date,
  targetPeriodStartInput: string | Date,
  overwriteExisting: boolean,
  actor: UserPublic
) {
  const tenantId = actor.tenantId || 'default-tenant'
  const sourceBounds = getWeekPeriodBoundaries(sourcePeriodStartInput)
  const targetBounds = getWeekPeriodBoundaries(targetPeriodStartInput)

  const sourceSchedule = await prisma.workSchedule.findFirst({
    where: { tenantId, siteId, periodStart: sourceBounds.periodStart },
    include: { shifts: { include: { segments: true } } }
  })
  if (!sourceSchedule || sourceSchedule.shifts.length === 0) {
    throw new Error('Aucun shift trouvé dans la semaine source à copier.')
  }

  const targetSchedule = await getOrCreateWorkSchedule(siteId, targetBounds.periodStart, actor)
  if (targetSchedule.status === ScheduleStatus.LOCKED || targetSchedule.status === ScheduleStatus.ARCHIVED) {
    throw new Error('Impossible de copier vers une semaine verrouillée ou archivée.')
  }

  if (targetSchedule.status === ScheduleStatus.PUBLISHED) {
    throw new Error('Impossible de remplacer un planning déjà publié. Dépubliez ou modifiez le planning directement.')
  }

  const result = await prisma.$transaction(async (tx) => {
    if (overwriteExisting) {
      await tx.scheduledShift.deleteMany({ where: { scheduleId: targetSchedule.id } })
    }

    let copiedCount = 0
    let skippedCount = 0

    for (const srcShift of sourceSchedule.shifts) {
      // Calculate target date by adding difference in days
      const daysDiff = Math.round((targetBounds.periodStart.getTime() - sourceBounds.periodStart.getTime()) / (1000 * 3600 * 24))
      const targetWorkDate = new Date(srcShift.workDate)
      targetWorkDate.setUTCDate(targetWorkDate.getUTCDate() + daysDiff)

      // Verify eligibility on target date
      const eligibility = await verifyEmployeeEligibility(srcShift.employeeId, siteId, targetWorkDate, tenantId)
      if (!eligibility.isEligible) {
        skippedCount++
        continue
      }

      const copyConflicts = await detectShiftConflicts(
        tenantId,
        srcShift.employeeId,
        siteId,
        targetWorkDate,
        srcShift.segments.map(seg => ({
          order: seg.order,
          startLocalTime: seg.startLocalTime,
          endLocalTime: seg.endLocalTime,
          endsNextDay: seg.endsNextDay,
          segmentType: seg.segmentType
        })),
        undefined,
        tx
      )
      if (copyConflicts.some(conflict => conflict.type === 'BLOCKING')) {
        skippedCount++
        continue
      }

      const newShift = await tx.scheduledShift.create({
        data: {
          tenantId,
          scheduleId: targetSchedule.id,
          employeeId: srcShift.employeeId,
          siteId,
          positionId: srcShift.positionId,
          assignmentId: eligibility.assignmentId || null,
          workDate: targetWorkDate,
          status: ScheduledShiftStatus.PLANNED,
          templateId: srcShift.templateId,
          templateNameSnapshot: srcShift.templateNameSnapshot,
          templateColorSnapshot: srcShift.templateColorSnapshot,
          totalWorkMinutes: srcShift.totalWorkMinutes,
          notes: srcShift.notes,
          createdByUserId: actor.id
        }
      })

      if (srcShift.segments.length > 0) {
        await tx.scheduledShiftSegment.createMany({
          data: srcShift.segments.map(seg => {
            const utcTimes = computeSegmentUtcTimes(targetWorkDate, seg.startLocalTime, seg.endLocalTime, seg.endsNextDay)
            return {
              shiftId: newShift.id,
              order: seg.order,
              startLocalTime: seg.startLocalTime,
              endLocalTime: seg.endLocalTime,
              endsNextDay: seg.endsNextDay,
              segmentType: seg.segmentType,
              startUtc: utcTimes.startUtc,
              endUtc: utcTimes.endUtc
            }
          })
        })
      }
      copiedCount++
    }

    return { copiedCount, skippedCount }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SCHEDULE_COPIED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'WorkSchedule',
    entityId: targetSchedule.id,
    metadata: { siteId, sourceWeek: sourceBounds.periodStart.toISOString(), copiedCount: result.copiedCount, skippedCount: result.skippedCount }
  })

  return result
}

export async function publishSchedule(scheduleId: string, confirmationString: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  if (confirmationString.trim() !== 'PUBLIER PLANNING') {
    throw new Error('La phrase de confirmation est incorrecte. Tapez exactement "PUBLIER PLANNING".')
  }

  const schedule = await prisma.workSchedule.findFirst({
    where: { id: scheduleId, tenantId },
    include: {
      site: true,
      shifts: {
        include: { employee: true, segments: true }
      }
    }
  })
  if (!schedule) throw new Error('Planning introuvable.')

  if (schedule.shifts.length === 0) {
    throw new Error('Impossible de publier un planning sans aucun shift.')
  }

  // Validate zero blocking conflicts
  for (const shift of schedule.shifts) {
    const conflicts = await detectShiftConflicts(
      tenantId,
      shift.employeeId,
      shift.siteId,
      shift.workDate,
      shift.segments.map(s => ({
        order: s.order,
        startLocalTime: s.startLocalTime,
        endLocalTime: s.endLocalTime,
        endsNextDay: s.endsNextDay,
        segmentType: s.segmentType
      })),
      shift.id
    )

    const blocking = conflicts.filter(c => c.type === 'BLOCKING')
    if (blocking.length > 0) {
      throw new Error(`Publication bloquée par un conflit sur l'employé ${shift.employee.firstName} ${shift.employee.lastName} : ${blocking[0].message}`)
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.workSchedule.update({
      where: { id: scheduleId },
      data: {
        status: ScheduleStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedByUserId: actor.id,
        version: { increment: 1 }
      }
    })

    await tx.scheduledShift.updateMany({
      where: { scheduleId },
      data: { status: ScheduledShiftStatus.PUBLISHED }
    })

    return s
  })

  // Log audit entry & notifications
  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SCHEDULE_PUBLISHED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'WorkSchedule',
    entityId: scheduleId,
    entityReference: schedule.site.name,
    metadata: { siteId: schedule.siteId, periodStart: schedule.periodStart.toISOString(), shiftsCount: schedule.shifts.length }
  })

  await createNotification({
    recipientRole: 'HR_MANAGER',
    type: 'HR_ALERT',
    severity: 'INFO',
    title: 'Planning RH publié',
    message: `Le planning du site "${schedule.site.name}" pour la semaine du ${schedule.periodStart.toISOString().slice(0, 10)} a été publié par ${actor.name}.`,
    actionUrl: `/rh/planning?siteId=${schedule.siteId}&date=${schedule.periodStart.toISOString().slice(0, 10)}`
  })

  return updated
}

export async function changePublishedShift(shiftId: string, input: UpdateScheduledShiftInput, reason: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  if (!reason || reason.trim().length < 5) {
    throw new Error('Le motif de modification d’un shift publié doit comporter au moins 5 caractères.')
  }

  const shift = await prisma.scheduledShift.findFirst({
    where: { id: shiftId, tenantId },
    include: { schedule: true, employee: true, segments: { orderBy: { order: 'asc' } } }
  })
  if (!shift) throw new Error('Shift introuvable.')
  if (shift.schedule.status === ScheduleStatus.LOCKED || shift.schedule.status === ScheduleStatus.ARCHIVED) {
    throw new Error('Impossible de modifier un planning verrouillé ou archivé.')
  }

  const beforeSnapshot = {
    positionId: shift.positionId,
    workDate: shift.workDate.toISOString(),
    totalWorkMinutes: shift.totalWorkMinutes,
    notes: shift.notes,
    segments: shift.segments
  }

  // Update shift
  const newSegments = input.segments || shift.segments.map(s => ({
    order: s.order,
    startLocalTime: s.startLocalTime,
    endLocalTime: s.endLocalTime,
    endsNextDay: s.endsNextDay,
    segmentType: s.segmentType
  }))

  const workDate = input.workDate ? new Date(input.workDate) : shift.workDate

  const updated = await prisma.$transaction(async (tx) => {
    // Acquire PostgreSQL transaction advisory lock on employeeId
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shift.employeeId}))`

    // Check conflicts inside locked transaction
    const conflicts = await detectShiftConflicts(tenantId, shift.employeeId, shift.siteId, workDate, newSegments, shift.id, tx)
    const blocking = conflicts.filter(c => c.type === 'BLOCKING')
    if (blocking.length > 0) {
      throw new Error(`Modification bloquée par un conflit : ${blocking[0].message}`)
    }

    let totalWorkMinutes = 0
    for (const seg of newSegments) {
      if (seg.segmentType !== 'UNPAID_BREAK') {
        totalWorkMinutes += calculateSegmentMinutes(seg.startLocalTime, seg.endLocalTime, seg.endsNextDay)
      }
    }
    const s = await tx.scheduledShift.update({
      where: { id: shiftId },
      data: {
        positionId: input.positionId,
        workDate,
        notes: input.notes !== undefined ? input.notes : shift.notes,
        totalWorkMinutes,
        status: ScheduledShiftStatus.CHANGED,
        updatedByUserId: actor.id,
        version: { increment: 1 }
      }
    })

    if (input.segments) {
      await tx.scheduledShiftSegment.deleteMany({ where: { shiftId } })
      await tx.scheduledShiftSegment.createMany({
        data: input.segments.map((seg, idx) => {
          const utcTimes = computeSegmentUtcTimes(workDate, seg.startLocalTime, seg.endLocalTime, seg.endsNextDay)
          return {
            shiftId,
            order: seg.order || idx + 1,
            startLocalTime: seg.startLocalTime,
            endLocalTime: seg.endLocalTime,
            endsNextDay: seg.endsNextDay ?? false,
            segmentType: seg.segmentType || ShiftSegmentType.WORK,
            startUtc: utcTimes.startUtc,
            endUtc: utcTimes.endUtc
          }
        })
      })
    }

    const afterShift = await tx.scheduledShift.findUnique({
      where: { id: shiftId },
      include: { segments: { orderBy: { order: 'asc' } } }
    })

    const afterSnapshot = {
      positionId: afterShift?.positionId,
      workDate: afterShift?.workDate.toISOString(),
      totalWorkMinutes: afterShift?.totalWorkMinutes,
      notes: afterShift?.notes,
      segments: afterShift?.segments
    }

    // Save change history
    await tx.scheduleChangeHistory.create({
      data: {
        tenantId,
        shiftId,
        changeReason: reason.trim(),
        beforeSnapshot: JSON.parse(JSON.stringify(beforeSnapshot)),
        afterSnapshot: JSON.parse(JSON.stringify(afterSnapshot)),
        changedById: actor.id
      }
    })

    return afterShift
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_PUBLISHED_SCHEDULE_CHANGED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'ScheduledShift',
    entityId: shiftId,
    entityReference: `${shift.employee.firstName} ${shift.employee.lastName}`,
    metadata: { reason }
  })

  return updated
}

export async function calculateStaffingCoverage(siteId: string, dateInput: string | Date, actor: UserPublic): Promise<StaffingCoverageResult[]> {
  const tenantId = actor.tenantId || 'default-tenant'
  const targetDate = new Date(dateInput)
  const dayOfWeek = targetDate.getUTCDay()
  const dateStr = targetDate.toISOString().slice(0, 10)

  const reqs = await prisma.staffingRequirement.findMany({
    where: { tenantId, siteId, dayOfWeek },
    include: { position: true }
  })

  if (reqs.length === 0) return []

  const dayStart = new Date(dateInput)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dateInput)
  dayEnd.setUTCHours(23, 59, 59, 999)

  const dayShifts = await prisma.scheduledShift.findMany({
    where: {
      tenantId,
      siteId,
      workDate: { gte: dayStart, lte: dayEnd },
      status: { in: [ScheduledShiftStatus.PLANNED, ScheduledShiftStatus.PUBLISHED, ScheduledShiftStatus.CHANGED] }
    },
    include: { segments: true }
  })
  const approvedLeaveDays = await prisma.leaveRequestDay.findMany({
    where: {
      tenantId,
      localDate: parseHrLocalDate(dateStr),
      requestedMinutes: { gt: 0 },
      leaveRequest: { status: 'APPROVED' }
    },
    select: { leaveRequest: { select: { employeeId: true } } }
  })
  const employeesOnLeave = new Set(approvedLeaveDays.map(day => day.leaveRequest.employeeId))

  const results: StaffingCoverageResult[] = []

  for (const req of reqs) {
    const reqStartMins = calculateSegmentMinutes('00:00', req.startLocalTime)
    const reqEndMins = calculateSegmentMinutes('00:00', req.endLocalTime)

    let actualCount = 0

    for (const shift of dayShifts) {
      if (employeesOnLeave.has(shift.employeeId)) continue
      if (shift.positionId !== req.positionId) continue

      for (const seg of shift.segments) {
        // Operational staffing coverage is satisfied ONLY by WORK segments (breaks do not count)
        if (seg.segmentType !== 'WORK') continue

        const segStartMins = calculateSegmentMinutes('00:00', seg.startLocalTime)
        const segEndMins = calculateSegmentMinutes('00:00', seg.endLocalTime, seg.endsNextDay)

        if (Math.max(reqStartMins, segStartMins) < Math.min(reqEndMins, segEndMins)) {
          actualCount++
          break
        }
      }
    }

    let status: 'COMPLETE' | 'UNDERSTAFFED' | 'OVERSTAFFED' = 'COMPLETE'
    if (actualCount < req.minEmployees) {
      status = 'UNDERSTAFFED'
    } else if (req.preferredEmployees && actualCount > req.preferredEmployees) {
      status = 'OVERSTAFFED'
    }

    results.push({
      siteId,
      date: dateStr,
      dayOfWeek,
      positionId: req.positionId,
      positionTitle: req.position.title,
      startLocalTime: req.startLocalTime,
      endLocalTime: req.endLocalTime,
      minRequired: req.minEmployees,
      actualCount,
      status
    })
  }

  return results
}

export async function deleteScheduledShift(shiftId: string, actor: UserPublic, reason = 'Annulation explicite du shift') {
  const tenantId = actor.tenantId || 'default-tenant'
  const shift = await prisma.scheduledShift.findFirst({
    where: { id: shiftId, tenantId },
    include: { employee: true, schedule: true, segments: true }
  })
  if (!shift) throw new Error('Shift introuvable.')

  if (shift.schedule.status === ScheduleStatus.LOCKED || shift.schedule.status === ScheduleStatus.ARCHIVED) {
    throw new Error('Impossible d’annuler un shift d’un planning verrouillé ou archivé.')
  }
  if (reason.trim().length < 5) throw new Error('Un motif d’annulation est obligatoire.')

  const beforeSnapshot = JSON.parse(JSON.stringify(shift))
  await prisma.$transaction(async tx => {
    await tx.scheduledShift.update({
      where: { id: shiftId },
      data: { status: ScheduledShiftStatus.CANCELLED, updatedByUserId: actor.id, version: { increment: 1 } }
    })
    await tx.scheduleChangeHistory.create({
      data: {
        tenantId,
        shiftId,
        changeReason: reason.trim(),
        beforeSnapshot,
        afterSnapshot: { ...beforeSnapshot, status: ScheduledShiftStatus.CANCELLED },
        changedById: actor.id
      }
    })
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SHIFT_CANCELLED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'ScheduledShift',
    entityId: shiftId,
    entityReference: `${shift.employee.firstName} ${shift.employee.lastName}`,
    metadata: { reason: reason.trim(), previousStatus: shift.status }
  })
}
