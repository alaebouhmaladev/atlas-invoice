import type { ContractType, LeaveApprovalWorkflow, LeaveCategory } from '@prisma/client'
import { prisma } from '../utils/db'
import { parseHrLocalDate } from '../utils/hrDates'
import { createAuditEntry } from './audit.service'
import type { UserPublic } from '~/types/auth'

export interface LeaveTypeInput {
  code: string
  name: string
  description?: string | null
  color?: string
  category: LeaveCategory
  isPaid?: boolean
  usesBalance?: boolean
  requiresDocument?: boolean
  allowPartialDay?: boolean
  allowHourly?: boolean
  requiresApproval?: boolean
  minimumNoticeDays?: number | null
  maximumConsecutiveDays?: number | null
}

export interface LeavePolicyInput {
  leaveTypeId: string
  siteId?: string | null
  departmentId?: string | null
  positionId?: string | null
  employeeId?: string | null
  contractType?: ContractType | null
  name: string
  effectiveFrom: string
  effectiveTo?: string | null
  entitlementMinutes?: number
  accrualMinutes?: number
  accrualFrequency?: string
  minutesPerDay: number
  workingWeekdays: number[]
  excludeHolidays?: boolean
  carryOverLimitMinutes?: number | null
  carryOverExpiryMonth?: number | null
  allowNegativeBalance?: boolean
  maximumNegativeMinutes?: number
  attachmentThresholdMinutes?: number | null
  approvalWorkflow?: LeaveApprovalWorkflow
  blockOnCoverageWarning?: boolean
  priority?: number
  allowDuringProbation?: boolean
  allowRetroactiveRequests?: boolean
}

export async function listLeaveTypes(tenantId: string, includeArchived = false) {
  return prisma.leaveType.findMany({
    where: { tenantId, ...(includeArchived ? {} : { archivedAt: null }) },
    include: { policies: { where: { isActive: true }, orderBy: { effectiveFrom: 'desc' } } },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
  })
}

export async function createLeaveType(input: LeaveTypeInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const leaveType = await prisma.leaveType.create({
    data: {
      tenantId,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      color: input.color || '#b49c80',
      category: input.category,
      isPaid: input.isPaid ?? false,
      usesBalance: input.usesBalance ?? false,
      requiresDocument: input.requiresDocument ?? false,
      allowPartialDay: input.allowPartialDay ?? true,
      allowHourly: input.allowHourly ?? false,
      requiresApproval: input.requiresApproval ?? true,
      minimumNoticeDays: input.minimumNoticeDays ?? null,
      maximumConsecutiveDays: input.maximumConsecutiveDays ?? null,
      createdById: actor.id
    }
  })
  await createAuditEntry({
    userId: actor.id,
    action: 'HR_LEAVE_TYPE_CREATED',
    category: 'HR_LEAVE',
    entityType: 'LeaveType',
    entityId: leaveType.id,
    entityReference: leaveType.code,
    metadata: { tenantId, category: leaveType.category }
  })
  return leaveType
}

export async function createLeavePolicy(input: LeavePolicyInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const leaveType = await prisma.leaveType.findFirst({ where: { id: input.leaveTypeId, tenantId, archivedAt: null } })
  if (!leaveType) throw new Error('Type de congé introuvable.')
  if (input.siteId) {
    const site = await prisma.workSite.findFirst({ where: { id: input.siteId, tenantId, archivedAt: null } })
    if (!site) throw new Error('Site de travail introuvable.')
  }
  const scopeKey = [
    `site:${input.siteId || '*'}`,
    `department:${input.departmentId || '*'}`,
    `position:${input.positionId || '*'}`,
    `employee:${input.employeeId || '*'}`,
    `contract:${input.contractType || '*'}`
  ].join('|')
  const weekdays = [...new Set(input.workingWeekdays)].sort()
  if (weekdays.some(day => day < 0 || day > 6)) throw new Error('Les jours ouvrés doivent être compris entre 0 et 6.')

  const effectiveFrom = parseHrLocalDate(input.effectiveFrom)
  const effectiveTo = input.effectiveTo ? parseHrLocalDate(input.effectiveTo) : null
  if (effectiveTo && effectiveTo < effectiveFrom) throw new Error('La date de fin de politique doit suivre sa date de début.')

  const policy = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${input.leaveTypeId}:${scopeKey}:${input.priority || 0}:leave-policy`}))`
    const overlap = await tx.leavePolicy.findFirst({
      where: {
        tenantId,
        leaveTypeId: input.leaveTypeId,
        scopeKey,
        priority: input.priority ?? 0,
        isActive: true,
        effectiveFrom: { lte: effectiveTo || new Date('9999-12-31T00:00:00.000Z') },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }]
      }
    })
    if (overlap) throw new Error('Une politique active de même portée et priorité chevauche déjà cette période.')
    return tx.leavePolicy.create({ data: {
      tenantId,
      leaveTypeId: input.leaveTypeId,
      siteId: input.siteId || null,
      departmentId: input.departmentId || null,
      positionId: input.positionId || null,
      employeeId: input.employeeId || null,
      contractType: input.contractType || null,
      scopeKey,
      name: input.name.trim(),
      effectiveFrom,
      effectiveTo,
      entitlementMinutes: input.entitlementMinutes ?? 0,
      accrualMinutes: input.accrualMinutes ?? 0,
      accrualFrequency: input.accrualFrequency?.trim().toUpperCase() || 'MANUAL',
      minutesPerDay: input.minutesPerDay,
      workingWeekdays: weekdays,
      excludeHolidays: input.excludeHolidays ?? true,
      carryOverLimitMinutes: input.carryOverLimitMinutes ?? null,
      carryOverExpiryMonth: input.carryOverExpiryMonth ?? null,
      allowNegativeBalance: input.allowNegativeBalance ?? false,
      maximumNegativeMinutes: input.maximumNegativeMinutes ?? 0,
      attachmentThresholdMinutes: input.attachmentThresholdMinutes ?? null,
      approvalWorkflow: input.approvalWorkflow ?? 'HR_ONLY',
      blockOnCoverageWarning: input.blockOnCoverageWarning ?? false,
      priority: input.priority ?? 0,
      allowDuringProbation: input.allowDuringProbation ?? true,
      allowRetroactiveRequests: input.allowRetroactiveRequests ?? false,
      createdById: actor.id
    } })
  })
  await createAuditEntry({
    userId: actor.id,
    action: 'HR_LEAVE_POLICY_CREATED',
    category: 'HR_LEAVE',
    entityType: 'LeavePolicy',
    entityId: policy.id,
    entityReference: policy.name,
    metadata: { tenantId, leaveTypeId: policy.leaveTypeId, siteId: policy.siteId }
  })
  return policy
}

export interface HolidayCalendarInput {
  code: string
  name: string
  isDefault?: boolean
  siteIds?: string[]
}

export async function listHolidayCalendars(tenantId: string) {
  return prisma.holidayCalendar.findMany({
    where: { tenantId, isActive: true },
    include: { sites: { include: { site: true } }, holidays: { orderBy: { localDate: 'asc' } } },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }]
  })
}

export async function createHolidayCalendar(input: HolidayCalendarInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const siteIds = [...new Set(input.siteIds || [])]
  const sites = siteIds.length
    ? await prisma.workSite.findMany({ where: { tenantId, id: { in: siteIds }, archivedAt: null }, select: { id: true } })
    : []
  if (sites.length !== siteIds.length) throw new Error('Un ou plusieurs sites sont invalides.')

  const calendar = await prisma.$transaction(async tx => {
    if (input.isDefault) {
      await tx.holidayCalendar.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } })
    }
    return tx.holidayCalendar.create({
      data: {
        tenantId,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        isDefault: input.isDefault ?? false,
        createdById: actor.id,
        sites: { create: siteIds.map(siteId => ({ tenantId, siteId })) }
      },
      include: { sites: true }
    })
  })
  await createAuditEntry({
    userId: actor.id,
    action: 'HR_HOLIDAY_CALENDAR_CREATED',
    category: 'HR_LEAVE',
    entityType: 'HolidayCalendar',
    entityId: calendar.id,
    entityReference: calendar.code,
    metadata: { tenantId, siteIds }
  })
  return calendar
}

export async function addHoliday(
  calendarId: string,
  input: { localDate: string; name: string; description?: string | null; isPaid?: boolean; isWorkingDay?: boolean },
  actor: UserPublic
) {
  const tenantId = actor.tenantId || 'default-tenant'
  const calendar = await prisma.holidayCalendar.findFirst({ where: { id: calendarId, tenantId, isActive: true } })
  if (!calendar) throw new Error('Calendrier de jours fériés introuvable.')
  const holiday = await prisma.holiday.create({
    data: {
      tenantId,
      calendarId,
      localDate: parseHrLocalDate(input.localDate),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      isPaid: input.isPaid ?? true,
      isWorkingDay: input.isWorkingDay ?? false,
      createdById: actor.id
    }
  })
  await createAuditEntry({
    userId: actor.id,
    action: 'HR_HOLIDAY_CREATED',
    category: 'HR_LEAVE',
    entityType: 'Holiday',
    entityId: holiday.id,
    entityReference: holiday.name,
    metadata: { tenantId, calendarId, localDate: input.localDate }
  })
  return holiday
}

export async function findHolidayForSiteDate(tenantId: string, siteId: string | null, date: Date, db: any = prisma) {
  return db.holiday.findFirst({
    where: {
      tenantId,
      localDate: parseHrLocalDate(date),
      calendar: {
        isActive: true,
        OR: [
          ...(siteId ? [{ sites: { some: { tenantId, siteId } } }] : []),
          { isDefault: true }
        ]
      }
    },
    orderBy: { calendar: { isDefault: 'asc' } }
  })
}
