import type { LeaveDayPortion, Prisma } from '@prisma/client'
import { prisma } from '../utils/db'
import { enumerateHrDates, getHrDateRange, parseHrLocalDate } from '../utils/hrDates'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import { findHolidayForSiteDate } from './hrLeaveConfiguration.service'
import { recordLeaveBalanceEntry } from './hrLeaveBalance.service'
import type { UserPublic } from '~/types/auth'
import { hasHrPermission } from '../utils/hrPermissions'
import { calculateStaffingCoverage } from './hrSchedule.service'

export interface CreateLeaveRequestInput {
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  startPortion?: LeaveDayPortion
  endPortion?: LeaveDayPortion
  privateReason?: string | null
  documentId?: string | null
  customStartMinute?: number | null
  customEndMinute?: number | null
  emergencyContact?: string | null
  idempotencyKey?: string | null
  saveAsDraft?: boolean
}

export function calculatePortionMinutes(minutes: number, portion: LeaveDayPortion, customStartMinute?: number | null, customEndMinute?: number | null) {
  if (portion === 'FULL_DAY') return minutes
  if (portion === 'CUSTOM') {
    if (customStartMinute == null || customEndMinute == null || customEndMinute <= customStartMinute) {
      throw new Error('La plage horaire personnalisée est invalide.')
    }
    return Math.min(minutes, customEndMinute - customStartMinute)
  }
  return Math.round(minutes / 2)
}

export function redactLeaveRequest<T extends Record<string, any>>(request: T, includePrivate = false): T {
  if (includePrivate) return request
  const copy: Record<string, any> = { ...request }
  delete copy.privateReason
  delete copy.privateDecisionNote
  if (copy.document) delete copy.document
  if (Array.isArray(copy.approvalSteps)) {
    copy.approvalSteps = copy.approvalSteps.map((step: any) => {
      const safe = { ...step }
      delete safe.privateNote
      return safe
    })
  }
  return copy as T
}

async function notifyTenantReviewers(tenantId: string, title: string, message: string, actionUrl: string, dedupe: string) {
  const reviewers = await prisma.user.findMany({
    where: { tenantId, isActive: true, role: { in: ['SUPER_ADMIN', 'HR_MANAGER'] } },
    select: { id: true }
  })
  await Promise.all(reviewers.map(user => createNotification({
    recipientUserId: user.id,
    type: 'LEAVE_APPROVAL',
    severity: 'INFO',
    title,
    message,
    actionUrl,
    deduplicationKey: `${dedupe}:${user.id}`
  })))
}

export async function createLeaveRequest(input: CreateLeaveRequestInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const startDate = parseHrLocalDate(input.startDate)
  const endDate = parseHrLocalDate(input.endDate)
  if (endDate < startDate) throw new Error('La date de fin doit être postérieure ou égale à la date de début.')

  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${input.employeeId}:leave-request`}))`

    if (input.idempotencyKey) {
      const existing = await tx.leaveRequest.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
        include: { days: true, leaveType: true, employee: true, approvalSteps: true }
      })
      if (existing) return redactLeaveRequest(existing, true)
    }

    const employee = await tx.employee.findFirst({
      where: { id: input.employeeId, tenantId, archivedAt: null, employmentStatus: { in: ['ACTIVE', 'ONBOARDING'] } }
    })
    const leaveType = await tx.leaveType.findFirst({ where: { id: input.leaveTypeId, tenantId, isActive: true, archivedAt: null } })
    if (!employee || !leaveType) throw new Error('Employé ou type de congé introuvable.')
    if (!hasHrPermission(actor, 'hr.leave.create_for_employee') && employee.linkedUserId !== actor.id) {
      const error: any = new Error('Vous ne pouvez créer une demande que pour votre propre dossier salarié.')
      error.statusCode = 403
      throw error
    }
    if (!leaveType.allowPartialDay && ((input.startPortion && input.startPortion !== 'FULL_DAY') || (input.endPortion && input.endPortion !== 'FULL_DAY'))) {
      throw new Error('Ce type de congé ne permet pas les demi-journées.')
    }
    if ((input.startPortion === 'CUSTOM' || input.endPortion === 'CUSTOM') && !leaveType.allowHourly) {
      throw new Error('Ce type de congé ne permet pas les absences horaires.')
    }

    if (input.documentId) {
      const document = await tx.employeeDocument.findFirst({
        where: { id: input.documentId, tenantId, employeeId: employee.id, archivedAt: null }
      })
      if (!document) throw new Error('Justificatif RH introuvable ou non autorisé.')
    } else if (leaveType.requiresDocument && !input.saveAsDraft) {
      throw new Error('Un justificatif est obligatoire pour ce type de congé.')
    }

    const overlapping = !input.saveAsDraft ? await tx.leaveRequest.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'CANCEL_REQUESTED'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    }) : null
    if (overlapping) throw new Error('Une demande active existe déjà sur tout ou partie de cette période.')

    const assignment = await tx.employeeAssignment.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        startDate: { lte: startDate },
        OR: [{ endDate: null }, { endDate: { gte: endDate } }]
      },
      orderBy: { isPrimary: 'desc' },
      include: { site: true, department: true, position: true, managerEmployee: { include: { linkedUser: true } } }
    })
    if (!assignment) throw new Error('Aucune affectation valide ne couvre la période demandée.')

    const contract = await tx.employmentContract.findFirst({
      where: { tenantId, employeeId: employee.id, status: 'ACTIVE', startDate: { lte: startDate }, OR: [{ endDate: null }, { endDate: { gte: endDate } }] },
      orderBy: { startDate: 'desc' }
    })
    if (!contract) throw new Error('Aucun contrat actif ne couvre la période demandée.')

    const policy = await tx.leavePolicy.findFirst({
      where: {
        tenantId,
        leaveTypeId: leaveType.id,
        isActive: true,
        effectiveFrom: { lte: startDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: endDate } }],
        AND: [
          { OR: [{ siteId: assignment.siteId }, { siteId: null }] },
          { OR: [{ departmentId: assignment.departmentId }, { departmentId: null }] },
          { OR: [{ positionId: assignment.positionId }, { positionId: null }] },
          { OR: [{ employeeId: employee.id }, { employeeId: null }] },
          { OR: [{ contractType: contract.contractType }, { contractType: null }] }
        ]
      },
      orderBy: [{ priority: 'desc' }, { employeeId: 'desc' }, { siteId: 'desc' }, { effectiveFrom: 'desc' }]
    })
    if (!policy) throw new Error('Aucune politique active ne couvre ce type de congé et cette période.')

    const today = parseHrLocalDate(new Date())
    if (startDate < today && !policy.allowRetroactiveRequests) {
      throw new Error('Cette politique ne permet pas les demandes rétroactives.')
    }

    const dayInputs: Prisma.LeaveRequestDayCreateWithoutLeaveRequestInput[] = []
    const conflictingShiftIds: string[] = []
    for (const [index, dateString] of enumerateHrDates(startDate, endDate).entries()) {
      const localDate = parseHrLocalDate(dateString)
      const range = getHrDateRange(localDate)
      const shift = await tx.scheduledShift.findFirst({
        where: {
          tenantId,
          employeeId: employee.id,
          workDate: { gte: range.start, lte: range.end },
          status: { in: ['PLANNED', 'PUBLISHED', 'CHANGED'] }
        }
      })
      const holiday = policy.excludeHolidays
        ? await findHolidayForSiteDate(tenantId, assignment.siteId, localDate, tx)
        : null
      const weekday = localDate.getUTCDay()
      const plannedMinutes = shift?.totalWorkMinutes || (policy.workingWeekdays.includes(weekday) ? policy.minutesPerDay : 0)
      if (shift) conflictingShiftIds.push(shift.id)
      const isWorkingDay = plannedMinutes > 0 && (!holiday || holiday.isWorkingDay)
      let portion: LeaveDayPortion = 'FULL_DAY'
      if (index === 0) portion = input.startPortion || 'FULL_DAY'
      if (dateString === input.endDate) portion = input.endPortion || portion
      const requestedMinutes = isWorkingDay ? calculatePortionMinutes(plannedMinutes, portion, input.customStartMinute, input.customEndMinute) : 0
      dayInputs.push({
        tenantId,
        localDate,
        site: { connect: { id: assignment.siteId } },
        ...(shift ? { scheduledShift: { connect: { id: shift.id } } } : {}),
        ...(holiday ? { holiday: { connect: { id: holiday.id } } } : {}),
        portion,
        plannedMinutes,
        requestedMinutes,
        isWorkingDay
      })
    }
    const requestedMinutes = dayInputs.reduce((sum, day) => sum + Number(day.requestedMinutes), 0)
    if (requestedMinutes <= 0) {
      throw new Error('La période ne contient aucun temps ouvré selon le planning ou la politique configurée.')
    }

    const staffingImpact: Prisma.InputJsonObject[] = []
    for (const day of dayInputs.filter(item => item.scheduledShift && Number(item.requestedMinutes) > 0)) {
      const localDate = parseHrLocalDate(day.localDate as Date)
      const coverage = await calculateStaffingCoverage(assignment.siteId, localDate, actor)
      for (const item of coverage.filter(item => item.positionId === assignment.positionId)) {
        const projectedCount = Math.max(0, item.actualCount - 1)
        if (projectedCount < item.minRequired) staffingImpact.push({
          date: item.date,
          positionId: item.positionId,
          positionTitle: item.positionTitle,
          startLocalTime: item.startLocalTime,
          endLocalTime: item.endLocalTime,
          minRequired: item.minRequired,
          actualCount: item.actualCount,
          projectedCount
        })
      }
    }

    const sequenceYear = startDate.getUTCFullYear()
    const sequence = await tx.documentSequence.upsert({
      where: { type_year: { type: `LEAVE:${tenantId}`, year: sequenceYear } },
      create: { type: `LEAVE:${tenantId}`, year: sequenceYear, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } }
    })
    const requestNumber = `CON-${sequenceYear}-${String(sequence.lastNumber).padStart(5, '0')}`
    const workflow = policy.approvalWorkflow
    const submittedStatus = workflow === 'MANAGER_ONLY' || workflow === 'MANAGER_THEN_HR' ? 'PENDING_MANAGER' : 'PENDING_HR'
    const approvalSteps = input.saveAsDraft ? [] : [
      ...(['MANAGER_ONLY', 'MANAGER_THEN_HR'].includes(workflow) ? [{ tenantId, sequence: 1, approverUserId: assignment.managerEmployee?.linkedUserId || null }] : []),
      ...(['HR_ONLY', 'MANAGER_THEN_HR', 'AUTOMATIC'].includes(workflow) ? [{ tenantId, sequence: workflow === 'MANAGER_THEN_HR' ? 2 : 1, approverRole: 'HR_MANAGER' as const }] : [])
    ]
    if (!input.saveAsDraft && workflow !== 'HR_ONLY' && !approvalSteps[0]?.approverUserId && !approvalSteps[0]?.approverRole) {
      throw new Error('Aucun responsable lié ne peut traiter la première étape de validation.')
    }

    const request = await tx.leaveRequest.create({
      data: {
        tenantId,
        requestNumber,
        sequenceYear,
        sequenceNumber: sequence.lastNumber,
        idempotencyKey: input.idempotencyKey || null,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        status: input.saveAsDraft ? 'DRAFT' : submittedStatus,
        startDate,
        endDate,
        startPortion: input.startPortion || 'FULL_DAY',
        endPortion: input.endPortion || 'FULL_DAY',
        customStartMinute: input.customStartMinute ?? null,
        customEndMinute: input.customEndMinute ?? null,
        requestedMinutes,
        privateReason: input.privateReason?.trim() || null,
        documentId: input.documentId || null,
        attachmentStatus: input.documentId ? 'PROVIDED' : 'MISSING',
        emergencyContact: input.emergencyContact?.trim() || null,
        submittedById: actor.id,
        submittedAt: input.saveAsDraft ? null : new Date(),
        policySnapshot: JSON.parse(JSON.stringify(policy)),
        assignmentSnapshot: JSON.parse(JSON.stringify({
          id: assignment.id,
          siteId: assignment.siteId,
          siteName: assignment.site.name,
          departmentId: assignment.departmentId,
          departmentName: assignment.department.name,
          positionId: assignment.positionId,
          positionTitle: assignment.position.title,
          managerUserId: assignment.managerEmployee?.linkedUserId || null
        })),
        planningImpactSnapshot: {
          conflictingShiftIds,
          affectedWorkingDays: dayInputs.filter(day => day.isWorkingDay).length,
          staffingWarning: staffingImpact.length > 0,
          staffingImpact,
          blockOnCoverageWarning: policy.blockOnCoverageWarning,
          publishedSchedulesPreserved: true
        },
        days: { create: dayInputs },
        ...(approvalSteps.length ? { approvalSteps: { create: approvalSteps } } : {})
      },
      include: { days: true, leaveType: true, employee: true, approvalSteps: true }
    })

    if (leaveType.usesBalance && !input.saveAsDraft) {
      const yearStart = new Date(Date.UTC(startDate.getUTCFullYear(), 0, 1))
      const yearEnd = new Date(Date.UTC(startDate.getUTCFullYear(), 11, 31))
      await recordLeaveBalanceEntry(tenantId, {
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        periodStart: yearStart,
        periodEnd: yearEnd,
        entryType: 'RESERVATION',
        amountMinutes: requestedMinutes,
        effectiveDate: startDate,
        reason: `Réservation demande ${request.id}`,
        idempotencyKey: `leave:${request.id}:reservation`,
        leaveRequestId: request.id,
        actorId: actor.id,
        allowNegativeBalance: policy.allowNegativeBalance
      }, tx)
    }

    await tx.leaveRequestHistory.create({
      data: {
        tenantId,
        leaveRequestId: request.id,
        action: input.saveAsDraft ? 'DRAFT_CREATED' : 'SUBMITTED',
        beforeSnapshot: {},
        afterSnapshot: { status: request.status, requestedMinutes },
        actorId: actor.id
      }
    })

    await createAuditEntry({
      userId: actor.id,
      action: input.saveAsDraft ? 'HR_LEAVE_REQUEST_DRAFTED' : 'HR_LEAVE_REQUEST_SUBMITTED',
      category: 'HR_LEAVE',
      entityType: 'LeaveRequest',
      entityId: request.id,
      entityReference: `${employee.employeeNumber}:${input.startDate}:${input.endDate}`,
      metadata: { tenantId, employeeId: employee.id, leaveTypeId: leaveType.id, requestedMinutes }
    })

    if (!input.saveAsDraft) await notifyTenantReviewers(
      tenantId,
      'Nouvelle demande de congé',
      `${employee.displayName} a une demande en attente de validation.`,
      `/rh/conges/${request.id}`,
      `leave-request:${request.id}:submitted`
    )
    if (!input.saveAsDraft && staffingImpact.length > 0) await notifyTenantReviewers(
      tenantId,
      'Alerte de couverture planning',
      `La demande de ${employee.displayName} peut créer un sous-effectif. Le planning publié reste inchangé.`,
      `/rh/conges/${request.id}`,
      `leave-request:${request.id}:staffing-warning`
    )
    return redactLeaveRequest(request, true)
  })
}

export async function listLeaveRequests(
  tenantId: string,
  filters: { status?: string; employeeId?: string; employeeIds?: string[]; siteId?: string } = {},
  includePrivate = false
) {
  const rows = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status as any } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.employeeIds ? { employeeId: { in: filters.employeeIds } } : {}),
      ...(filters.siteId ? { days: { some: { siteId: filters.siteId } } } : {})
    },
    include: {
      employee: { select: { id: true, employeeNumber: true, displayName: true } },
      leaveType: { select: { id: true, code: true, name: true, color: true, category: true, requiresDocument: true } },
      days: { select: { localDate: true, requestedMinutes: true, isWorkingDay: true, siteId: true } },
      approvalSteps: { orderBy: { sequence: 'asc' }, select: { id: true, sequence: true, status: true, approverRole: true, decidedAt: true, decisionBy: { select: { id: true, name: true } }, privateNote: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  return rows.map(row => redactLeaveRequest(row, includePrivate))
}

export async function getLeaveRequest(tenantId: string, id: string, includePrivate = false) {
  const row = await prisma.leaveRequest.findFirst({
    where: { id, tenantId },
    include: {
      employee: { select: { id: true, employeeNumber: true, displayName: true } },
      leaveType: true,
      days: { include: { site: { select: { id: true, name: true } }, scheduledShift: true, holiday: true }, orderBy: { localDate: 'asc' } },
      approvalSteps: { include: { decisionBy: { select: { id: true, name: true } } }, orderBy: { sequence: 'asc' } },
      histories: { select: { id: true, action: true, createdAt: true, actor: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
      ...(includePrivate ? { document: true } : {})
    }
  })
  return row ? redactLeaveRequest(row, includePrivate) : null
}

async function requireOwnedRequest(tenantId: string, requestId: string, actor: UserPublic, tx: Prisma.TransactionClient) {
  const request = await tx.leaveRequest.findFirst({
    where: { id: requestId, tenantId },
    include: { employee: true, leaveType: true, approvalSteps: true }
  })
  if (!request) throw new Error('Demande de congé introuvable.')
  if (!hasHrPermission(actor, 'hr.leave.create_for_employee') && request.employee.linkedUserId !== actor.id) {
    const error: any = new Error('Cette demande ne relève pas de votre dossier salarié.')
    error.statusCode = 403
    throw error
  }
  return request
}

export async function submitDraftLeaveRequest(tenantId: string, requestId: string, actor: UserPublic, expectedVersion?: number) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${requestId}:leave-submit`}))`
    const request = await requireOwnedRequest(tenantId, requestId, actor, tx)
    if (request.status !== 'DRAFT') return { id: request.id, status: request.status, idempotent: true }
    if (expectedVersion !== undefined && request.version !== expectedVersion) throw new Error('Cette demande a été modifiée. Rechargez-la avant de la soumettre.')
    if (request.leaveType.requiresDocument && !request.documentId) throw new Error('Un justificatif est obligatoire avant la soumission.')
    const overlap = await tx.leaveRequest.findFirst({
      where: { tenantId, employeeId: request.employeeId, id: { not: request.id }, status: { in: ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'CANCEL_REQUESTED'] }, startDate: { lte: request.endDate }, endDate: { gte: request.startDate } }
    })
    if (overlap) throw new Error('Une demande active existe déjà sur tout ou partie de cette période.')
    const policy = (request.policySnapshot || {}) as any
    const assignment = (request.assignmentSnapshot || {}) as any
    const workflow = policy.approvalWorkflow || 'HR_ONLY'
    const steps = [
      ...(['MANAGER_ONLY', 'MANAGER_THEN_HR'].includes(workflow) ? [{ tenantId, sequence: 1, approverUserId: assignment.managerUserId || null }] : []),
      ...(['HR_ONLY', 'MANAGER_THEN_HR', 'AUTOMATIC'].includes(workflow) ? [{ tenantId, sequence: workflow === 'MANAGER_THEN_HR' ? 2 : 1, approverRole: 'HR_MANAGER' as const }] : [])
    ]
    if (!steps.length || (!steps[0]?.approverUserId && !steps[0]?.approverRole)) throw new Error('Aucun circuit de validation exploitable n’est configuré.')
    await tx.leaveApprovalStep.createMany({ data: steps.map(step => ({ ...step, leaveRequestId: request.id })) })
    if (request.leaveType.usesBalance) {
      const year = request.startDate.getUTCFullYear()
      await recordLeaveBalanceEntry(tenantId, { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, periodStart: new Date(Date.UTC(year, 0, 1)), periodEnd: new Date(Date.UTC(year, 11, 31)), entryType: 'RESERVATION', amountMinutes: request.requestedMinutes, effectiveDate: request.startDate, reason: `Réservation demande ${request.requestNumber}`, idempotencyKey: `leave:${request.id}:reservation`, leaveRequestId: request.id, actorId: actor.id, allowNegativeBalance: policy.allowNegativeBalance === true }, tx)
    }
    const status = workflow === 'MANAGER_ONLY' || workflow === 'MANAGER_THEN_HR' ? 'PENDING_MANAGER' : 'PENDING_HR'
    await tx.leaveRequest.update({ where: { id: request.id }, data: { status, submittedAt: new Date(), version: { increment: 1 } } })
    await tx.leaveRequestHistory.create({ data: { tenantId, leaveRequestId: request.id, action: 'SUBMITTED', beforeSnapshot: { status: 'DRAFT' }, afterSnapshot: { status }, actorId: actor.id } })
    return { id: request.id, status }
  })
}

export async function withdrawLeaveRequest(tenantId: string, requestId: string, reason: string, actor: UserPublic) {
  if (reason.trim().length < 3) throw new Error('Un motif de retrait est obligatoire.')
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${requestId}:leave-withdraw`}))`
    const request = await requireOwnedRequest(tenantId, requestId, actor, tx)
    if (request.status === 'WITHDRAWN') return { id: request.id, status: request.status, idempotent: true }
    if (!['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_MANAGER', 'PENDING_HR'].includes(request.status)) throw new Error('Cette demande ne peut plus être retirée.')
    if (request.leaveType.usesBalance) {
      const year = request.startDate.getUTCFullYear()
      await recordLeaveBalanceEntry(tenantId, { employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, periodStart: new Date(Date.UTC(year, 0, 1)), periodEnd: new Date(Date.UTC(year, 11, 31)), entryType: 'RELEASE', amountMinutes: request.requestedMinutes, effectiveDate: request.startDate, reason: `Retrait demande ${request.requestNumber}`, idempotencyKey: `leave:${request.id}:release-withdrawn`, leaveRequestId: request.id, actorId: actor.id, allowNegativeBalance: true }, tx)
    }
    await tx.leaveApprovalStep.updateMany({ where: { leaveRequestId: request.id, status: 'PENDING' }, data: { status: 'CANCELLED' } })
    await tx.leaveRequest.update({ where: { id: request.id }, data: { status: 'WITHDRAWN', withdrawnAt: new Date(), privateDecisionNote: reason.trim(), version: { increment: 1 } } })
    await tx.leaveRequestHistory.create({ data: { tenantId, leaveRequestId: request.id, action: 'WITHDRAWN', beforeSnapshot: { status: request.status }, afterSnapshot: { status: 'WITHDRAWN' }, actorId: actor.id } })
    return { id: request.id, status: 'WITHDRAWN' }
  })
}

export async function requestLeaveCancellation(tenantId: string, requestId: string, reason: string, actor: UserPublic) {
  if (reason.trim().length < 5) throw new Error('Un motif d’annulation est obligatoire.')
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${requestId}:leave-cancel-request`}))`
    const request = await requireOwnedRequest(tenantId, requestId, actor, tx)
    if (request.status === 'CANCEL_REQUESTED') return { id: request.id, status: request.status, idempotent: true }
    if (request.status !== 'APPROVED') throw new Error('Seule une demande approuvée peut faire l’objet d’une demande d’annulation.')
    await tx.leaveRequest.update({ where: { id: request.id }, data: { status: 'CANCEL_REQUESTED', cancellationRequestedAt: new Date(), cancellationReason: reason.trim(), version: { increment: 1 } } })
    await tx.leaveRequestHistory.create({ data: { tenantId, leaveRequestId: request.id, action: 'CANCELLATION_REQUESTED', beforeSnapshot: { status: 'APPROVED' }, afterSnapshot: { status: 'CANCEL_REQUESTED' }, actorId: actor.id } })
    await notifyTenantReviewers(tenantId, 'Annulation de congé à valider', `La demande ${request.requestNumber} nécessite une décision d’annulation.`, `/rh/conges/${request.id}`, `leave:${request.id}:cancel-requested`)
    return { id: request.id, status: 'CANCEL_REQUESTED' }
  })
}
