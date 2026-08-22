import { Prisma } from '@prisma/client'
import type { UserPublic } from '../../types/auth'
import { prisma } from '../utils/db'

const tenantOf = (actor: UserPublic) => actor.tenantId || 'default-tenant'
const error = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode, data: { message } })

export async function listPayrollDebts(actor: UserPublic) {
  const tenantId = tenantOf(actor)
  const [advances, loans] = await Promise.all([
    prisma.employeeAdvance.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    prisma.employeeLoan.findMany({
      where: { tenantId },
      include: { installments: { orderBy: { installmentNo: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    })
  ])
  return { advances, loans }
}

export async function createAdvance(
  input: {
    employeeId: string
    reference: string
    amount: string
    disbursementDate: string
    repaymentStart: string
    installmentAmount: string
    reason?: string
  },
  actor: UserPublic
) {
  const tenantId = tenantOf(actor)
  const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, tenantId, archivedAt: null } })
  if (!employee) throw error('Employé introuvable.', 404)
  const amount = new Prisma.Decimal(input.amount)
  const installment = new Prisma.Decimal(input.installmentAmount)
  if (amount.lte(0) || installment.lte(0) || installment.gt(amount))
    throw error('Les montants de l’avance sont invalides.')
  return prisma.employeeAdvance.create({
    data: {
      tenantId,
      employeeId: employee.id,
      reference: input.reference.trim(),
      originalAmount: amount,
      remainingAmount: amount,
      disbursementDate: new Date(`${input.disbursementDate}T00:00:00.000Z`),
      repaymentStart: new Date(`${input.repaymentStart}T00:00:00.000Z`),
      installmentAmount: installment,
      reason: input.reason?.trim() || null,
      createdById: actor.id
    }
  })
}

export async function createLoan(
  input: {
    employeeId: string
    reference: string
    amount: string
    disbursementDate: string
    repaymentStart: string
    installmentAmount: string
    installmentCount: number
    reason?: string
  },
  actor: UserPublic
) {
  const tenantId = tenantOf(actor)
  const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, tenantId, archivedAt: null } })
  if (!employee) throw error('Employé introuvable.', 404)
  const amount = new Prisma.Decimal(input.amount)
  const installment = new Prisma.Decimal(input.installmentAmount)
  if (amount.lte(0) || installment.lte(0) || installment.gt(amount) || input.installmentCount < 1)
    throw error('Les paramètres du prêt sont invalides.')
  return prisma.$transaction(async (tx) => {
    const loan = await tx.employeeLoan.create({
      data: {
        tenantId,
        employeeId: employee.id,
        reference: input.reference.trim(),
        originalAmount: amount,
        remainingAmount: amount,
        disbursementDate: new Date(`${input.disbursementDate}T00:00:00.000Z`),
        repaymentStart: new Date(`${input.repaymentStart}T00:00:00.000Z`),
        installmentAmount: installment,
        installmentCount: input.installmentCount,
        reason: input.reason?.trim() || null,
        createdById: actor.id
      }
    })
    let remaining = amount
    const due = new Date(`${input.repaymentStart}T00:00:00.000Z`)
    for (let index = 1; index <= input.installmentCount && remaining.gt(0); index++) {
      const installmentValue = Prisma.Decimal.min(installment, remaining)
      await tx.employeeLoanInstallment.create({
        data: { tenantId, loanId: loan.id, installmentNo: index, dueDate: new Date(due), amount: installmentValue }
      })
      remaining = remaining.minus(installmentValue)
      due.setUTCMonth(due.getUTCMonth() + 1)
    }
    return loan
  })
}
