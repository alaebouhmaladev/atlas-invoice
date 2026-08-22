import { prisma } from '../utils/db'
import { parseHrLocalDate } from '../utils/hrDates'
import { createNotification } from './notification.service'
import { recordLeaveBalanceEntry } from './hrLeaveBalance.service'

export async function accrueConfiguredLeaveBalances(
  tenantId: string,
  effectiveDateInput: string | Date = new Date(),
  frequency = 'MONTHLY'
) {
  const effectiveDate = parseHrLocalDate(effectiveDateInput)
  const policies = await prisma.leavePolicy.findMany({
    where: {
      tenantId,
      isActive: true,
      accrualFrequency: frequency.toUpperCase(),
      accrualMinutes: { gt: 0 },
      effectiveFrom: { lte: effectiveDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }]
    }
  })
  let processedCount = 0
  for (const policy of policies) {
    const employees = await prisma.employee.findMany({
      where: {
        tenantId,
        archivedAt: null,
        employmentStatus: { in: ['ACTIVE', 'ONBOARDING'] },
        ...(policy.siteId ? { assignments: { some: { siteId: policy.siteId, startDate: { lte: effectiveDate }, OR: [{ endDate: null }, { endDate: { gte: effectiveDate } }] } } } : {})
      },
      select: { id: true }
    })
    for (const employee of employees) {
      const year = effectiveDate.getUTCFullYear()
      await recordLeaveBalanceEntry(tenantId, {
        employeeId: employee.id,
        leaveTypeId: policy.leaveTypeId,
        periodStart: new Date(Date.UTC(year, 0, 1)),
        periodEnd: new Date(Date.UTC(year, 11, 31)),
        entryType: 'ACCRUAL',
        amountMinutes: policy.accrualMinutes,
        effectiveDate,
        reason: `Acquisition configurée (${policy.name})`,
        idempotencyKey: `accrual:${policy.id}:${employee.id}:${effectiveDate.toISOString().slice(0, 10)}`,
        allowNegativeBalance: true
      })
      processedCount++
    }
  }
  return { job: 'accrueConfiguredLeaveBalances', frequency: frequency.toUpperCase(), processedCount }
}

export async function sendLeaveApprovalReminders(tenantId: string) {
  const pending = await prisma.leaveRequest.count({ where: { tenantId, status: 'PENDING_APPROVAL' } })
  if (pending === 0) return { job: 'sendLeaveApprovalReminders', pendingCount: 0, recipientCount: 0 }
  const reviewers = await prisma.user.findMany({
    where: { tenantId, isActive: true, role: { in: ['SUPER_ADMIN', 'HR_MANAGER'] } },
    select: { id: true }
  })
  await Promise.all(reviewers.map(reviewer => createNotification({
    recipientUserId: reviewer.id,
    type: 'LEAVE_APPROVAL_REMINDER',
    severity: 'WARNING',
    title: 'Demandes de congé en attente',
    message: `${pending} demande(s) nécessitent une décision.`,
    actionUrl: '/rh/conges?status=PENDING_APPROVAL',
    deduplicationKey: `leave-reminder:${tenantId}:${reviewer.id}:${new Date().toISOString().slice(0, 10)}`
  })))
  return { job: 'sendLeaveApprovalReminders', pendingCount: pending, recipientCount: reviewers.length }
}

export function prorateAnnualMinutes(entitlementMinutes: number, hireDate: Date, year: number) {
  const startMonth = hireDate.getUTCFullYear() === year ? hireDate.getUTCMonth() : 0
  const eligibleMonths = Math.max(0, 12 - startMonth)
  return Math.floor((entitlementMinutes * eligibleMonths) / 12)
}

export async function initializeYearlyLeaveBalances(tenantId: string, year = new Date().getUTCFullYear()) {
  const effectiveDate = new Date(Date.UTC(year, 0, 1))
  const policies = await prisma.leavePolicy.findMany({ where: { tenantId, isActive: true, entitlementMinutes: { gt: 0 }, effectiveFrom: { lte: new Date(Date.UTC(year, 11, 31)) }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }] } })
  let processedCount = 0
  for (const policy of policies) {
    const employees = await prisma.employee.findMany({ where: { tenantId, archivedAt: null, hireDate: { lte: new Date(Date.UTC(year, 11, 31)) }, ...(policy.employeeId ? { id: policy.employeeId } : {}), ...(policy.siteId ? { assignments: { some: { siteId: policy.siteId, startDate: { lte: new Date(Date.UTC(year, 11, 31)) }, OR: [{ endDate: null }, { endDate: { gte: effectiveDate } }] } } } : {}) }, select: { id: true, hireDate: true } })
    for (const employee of employees) {
      const amountMinutes = prorateAnnualMinutes(policy.entitlementMinutes, employee.hireDate, year)
      if (amountMinutes <= 0) continue
      await recordLeaveBalanceEntry(tenantId, { employeeId: employee.id, leaveTypeId: policy.leaveTypeId, periodStart: effectiveDate, periodEnd: new Date(Date.UTC(year, 11, 31)), entryType: 'OPENING', amountMinutes, effectiveDate, reason: `Ouverture annuelle configurée (${policy.name})`, idempotencyKey: `opening:${policy.id}:${employee.id}:${year}`, allowNegativeBalance: true })
      processedCount++
    }
  }
  return { job: 'initializeYearlyLeaveBalances', year, processedCount }
}

export async function carryForwardLeaveBalances(tenantId: string, year = new Date().getUTCFullYear()) {
  const policies = await prisma.leavePolicy.findMany({ where: { tenantId, isActive: true, carryOverLimitMinutes: { not: null } } })
  let processedCount = 0
  for (const policy of policies) {
    const previous = await prisma.leaveBalance.findMany({ where: { tenantId, leaveTypeId: policy.leaveTypeId, periodStart: new Date(Date.UTC(year - 1, 0, 1)) } })
    for (const balance of previous) {
      const amountMinutes = Math.max(0, Math.min(balance.availableMinutes, policy.carryOverLimitMinutes || 0))
      if (!amountMinutes) continue
      await recordLeaveBalanceEntry(tenantId, { employeeId: balance.employeeId, leaveTypeId: policy.leaveTypeId, periodStart: new Date(Date.UTC(year, 0, 1)), periodEnd: new Date(Date.UTC(year, 11, 31)), entryType: 'CARRY_OVER', amountMinutes, effectiveDate: new Date(Date.UTC(year, 0, 1)), reason: `Report plafonné depuis ${year - 1}`, idempotencyKey: `carry-over:${policy.id}:${balance.employeeId}:${year}`, allowNegativeBalance: true })
      processedCount++
    }
  }
  return { job: 'carryForwardLeaveBalances', year, processedCount }
}

export async function expireCarriedLeaveBalances(tenantId: string, effectiveDateInput: string | Date = new Date()) {
  const effectiveDate = parseHrLocalDate(effectiveDateInput)
  const year = effectiveDate.getUTCFullYear()
  const policies = await prisma.leavePolicy.findMany({ where: { tenantId, isActive: true, carryOverExpiryMonth: effectiveDate.getUTCMonth() + 1 } })
  let processedCount = 0
  for (const policy of policies) {
    const balances = await prisma.leaveBalance.findMany({ where: { tenantId, leaveTypeId: policy.leaveTypeId, periodStart: new Date(Date.UTC(year, 0, 1)) }, include: { entries: { where: { entryType: 'CARRY_OVER' } } } })
    for (const balance of balances) {
      const amountMinutes = Math.min(balance.availableMinutes, balance.entries.reduce((sum, entry) => sum + entry.amountMinutes, 0))
      if (!amountMinutes) continue
      await recordLeaveBalanceEntry(tenantId, { employeeId: balance.employeeId, leaveTypeId: policy.leaveTypeId, periodStart: balance.periodStart, periodEnd: balance.periodEnd, entryType: 'EXPIRY', amountMinutes, effectiveDate, reason: `Expiration du report ${year}`, idempotencyKey: `carry-expiry:${policy.id}:${balance.employeeId}:${year}`, allowNegativeBalance: true })
      processedCount++
    }
  }
  return { job: 'expireCarriedLeaveBalances', year, processedCount }
}
