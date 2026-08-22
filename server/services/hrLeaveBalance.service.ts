import type { LeaveBalanceEntryType, Prisma } from '@prisma/client'
import { prisma } from '../utils/db'
import { parseHrLocalDate } from '../utils/hrDates'
import { createAuditEntry } from './audit.service'
import type { UserPublic } from '~/types/auth'
import { createNotification } from './notification.service'

type DbClient = Prisma.TransactionClient | typeof prisma

export interface BalanceEntryInput {
  employeeId: string
  leaveTypeId: string
  periodStart: string | Date
  periodEnd: string | Date
  entryType: LeaveBalanceEntryType
  amountMinutes: number
  effectiveDate: string | Date
  reason: string
  idempotencyKey?: string | null
  leaveRequestId?: string | null
  actorId?: string | null
  allowNegativeBalance?: boolean
  minimumAvailableMinutes?: number
}

export function calculateLeaveBalanceSnapshot(balance: {
  openingMinutes: number
  accruedMinutes: number
  adjustedMinutes: number
  reservedMinutes: number
  consumedMinutes: number
  expiredMinutes: number
}) {
  return {
    openingMinutes: balance.openingMinutes,
    accruedMinutes: balance.accruedMinutes,
    adjustedMinutes: balance.adjustedMinutes,
    reservedMinutes: balance.reservedMinutes,
    consumedMinutes: balance.consumedMinutes,
    expiredMinutes: balance.expiredMinutes,
    availableMinutes:
      balance.openingMinutes +
      balance.accruedMinutes +
      balance.adjustedMinutes -
      balance.reservedMinutes -
      balance.consumedMinutes -
      balance.expiredMinutes
  }
}

function applyEntryToTotals(before: ReturnType<typeof calculateLeaveBalanceSnapshot>, type: LeaveBalanceEntryType, amount: number) {
  const next = { ...before }
  switch (type) {
    case 'OPENING': next.openingMinutes += amount; break
    case 'ACCRUAL': next.accruedMinutes += amount; break
    case 'ADJUSTMENT': next.adjustedMinutes += amount; break
    case 'RESERVATION': next.reservedMinutes += amount; break
    case 'RELEASE': next.reservedMinutes -= amount; break
    case 'DEBIT': next.reservedMinutes -= amount; next.consumedMinutes += amount; break
    case 'REVERSAL': next.consumedMinutes -= amount; break
    case 'CARRY_OVER': next.accruedMinutes += amount; break
    case 'EXPIRY': next.expiredMinutes += amount; break
  }
  if (next.reservedMinutes < 0 || next.consumedMinutes < 0 || next.expiredMinutes < 0) {
    throw new Error('L’écriture produirait un état de solde incohérent.')
  }
  next.availableMinutes =
    next.openingMinutes + next.accruedMinutes + next.adjustedMinutes -
    next.reservedMinutes - next.consumedMinutes - next.expiredMinutes
  return next
}

export async function recordLeaveBalanceEntry(
  tenantId: string,
  input: BalanceEntryInput,
  db: DbClient = prisma
) {
  if (!Number.isInteger(input.amountMinutes) || input.amountMinutes === 0) {
    throw new Error('Le nombre de minutes doit être un entier non nul.')
  }
  if (input.entryType !== 'ADJUSTMENT' && input.amountMinutes < 0) {
    throw new Error('Cette écriture de solde exige un nombre de minutes positif.')
  }
  if (input.reason.trim().length < 3) throw new Error('Un motif de solde est obligatoire.')

  const execute = async (tx: DbClient) => {
    await (tx as any).$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${input.employeeId}:${input.leaveTypeId}:${parseHrLocalDate(input.periodStart).toISOString()}`}))`

    if (input.idempotencyKey) {
      const existing = await tx.leaveBalanceEntry.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } }
      })
      if (existing) return existing
    }

    const employee = await tx.employee.findFirst({ where: { id: input.employeeId, tenantId, archivedAt: null } })
    const leaveType = await tx.leaveType.findFirst({ where: { id: input.leaveTypeId, tenantId, archivedAt: null } })
    if (!employee || !leaveType) throw new Error('Employé ou type de congé introuvable.')

    const periodStart = parseHrLocalDate(input.periodStart)
    const periodEnd = parseHrLocalDate(input.periodEnd)
    let balance = await tx.leaveBalance.findUnique({
      where: { tenantId_employeeId_leaveTypeId_periodStart: { tenantId, employeeId: input.employeeId, leaveTypeId: input.leaveTypeId, periodStart } }
    })
    if (!balance) {
      balance = await tx.leaveBalance.create({
        data: { tenantId, employeeId: input.employeeId, leaveTypeId: input.leaveTypeId, periodStart, periodEnd }
      })
    }

    const before = calculateLeaveBalanceSnapshot(balance)
    const after = applyEntryToTotals(before, input.entryType, input.amountMinutes)
    const minimumAvailable = input.allowNegativeBalance ? (input.minimumAvailableMinutes ?? Number.MIN_SAFE_INTEGER) : 0
    if (after.availableMinutes < minimumAvailable) {
      const err: any = new Error('Solde de congé insuffisant.')
      err.statusCode = 409
      err.data = { code: 'INSUFFICIENT_LEAVE_BALANCE', availableMinutes: before.availableMinutes }
      throw err
    }

    await tx.leaveBalance.update({
      where: { id: balance.id },
      data: {
        openingMinutes: after.openingMinutes,
        accruedMinutes: after.accruedMinutes,
        adjustedMinutes: after.adjustedMinutes,
        reservedMinutes: after.reservedMinutes,
        consumedMinutes: after.consumedMinutes,
        expiredMinutes: after.expiredMinutes,
        availableMinutes: after.availableMinutes,
        version: { increment: 1 }
      }
    })

    return tx.leaveBalanceEntry.create({
      data: {
        tenantId,
        balanceId: balance.id,
        leaveRequestId: input.leaveRequestId || null,
        entryType: input.entryType,
        amountMinutes: input.amountMinutes,
        effectiveDate: parseHrLocalDate(input.effectiveDate),
        reason: input.reason.trim(),
        idempotencyKey: input.idempotencyKey || null,
        balanceBeforeSnapshot: before,
        balanceAfterSnapshot: after,
        actorId: input.actorId || null
      }
    })
  }

  if (db !== prisma) return execute(db)
  return prisma.$transaction(async tx => execute(tx))
}

export async function adjustLeaveBalance(
  tenantId: string,
  input: Omit<BalanceEntryInput, 'entryType' | 'actorId'>,
  actor: UserPublic
) {
  const effectiveDate = parseHrLocalDate(input.effectiveDate)
  const policy = await prisma.leavePolicy.findFirst({ where: { tenantId, leaveTypeId: input.leaveTypeId, isActive: true, effectiveFrom: { lte: effectiveDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveDate } }] }, orderBy: { priority: 'desc' } })
  const entry = await recordLeaveBalanceEntry(tenantId, { ...input, entryType: 'ADJUSTMENT', actorId: actor.id, allowNegativeBalance: policy?.allowNegativeBalance === true, minimumAvailableMinutes: policy?.allowNegativeBalance ? -policy.maximumNegativeMinutes : 0 })
  await createAuditEntry({
    userId: actor.id,
    action: 'HR_LEAVE_BALANCE_ADJUSTED',
    category: 'HR_LEAVE',
    entityType: 'LeaveBalanceEntry',
    entityId: entry.id,
    entityReference: input.reason,
    metadata: { tenantId, employeeId: input.employeeId, leaveTypeId: input.leaveTypeId, amountMinutes: input.amountMinutes }
  })
  const administrators = await prisma.user.findMany({ where: { tenantId, isActive: true, role: { in: ['SUPER_ADMIN', 'HR_MANAGER'] } }, select: { id: true } })
  await Promise.all(administrators.map(admin => createNotification({ recipientUserId: admin.id, type: 'LEAVE_BALANCE_ADJUSTMENT', severity: 'WARNING', title: 'Ajustement de solde enregistré', message: 'Un ajustement manuel de solde a été enregistré et audité.', actionUrl: '/rh/conges/soldes', entityType: 'LeaveBalanceEntry', entityId: entry.id, deduplicationKey: `leave-balance-adjustment:${entry.id}:${admin.id}` })))
  return entry
}

export async function getLeaveBalances(tenantId: string, employeeId?: string) {
  return prisma.leaveBalance.findMany({
    where: { tenantId, ...(employeeId ? { employeeId } : {}) },
    include: {
      employee: { select: { id: true, employeeNumber: true, displayName: true } },
      leaveType: { select: { id: true, code: true, name: true, color: true, category: true } },
      entries: { orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, entryType: true, amountMinutes: true, effectiveDate: true, reason: true, createdAt: true } }
    },
    orderBy: [{ employee: { displayName: 'asc' } }, { periodStart: 'desc' }]
  })
}
