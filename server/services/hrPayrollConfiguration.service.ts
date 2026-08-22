import { Prisma, type PayrollComponentKind, type PayrollComponentMode } from '@prisma/client'
import type { UserPublic } from '../../types/auth'
import { prisma } from '../utils/db'
import { contributionRuleSchema, taxBracketSchema } from './hrPayrollEngine'
import { z } from 'zod'

const tenantOf = (actor: UserPublic) => actor.tenantId || 'default-tenant'

function fail(message: string, statusCode = 400): never {
  const error = new Error(message) as Error & { statusCode: number; data: { message: string } }
  error.statusCode = statusCode
  error.data = { message }
  throw error
}

export async function listPayrollSettings(actor: UserPublic) {
  const tenantId = tenantOf(actor)
  const [configurations, ruleSets, components] = await Promise.all([
    prisma.payrollConfiguration.findMany({ where: { tenantId }, orderBy: { effectiveFrom: 'desc' } }),
    prisma.statutoryPayrollRuleSet.findMany({
      where: { tenantId },
      orderBy: { effectiveFrom: 'desc' },
      select: {
        id: true,
        name: true,
        countryCode: true,
        effectiveFrom: true,
        effectiveTo: true,
        verificationStatus: true,
        verifiedAt: true,
        officialSourceName: true,
        officialSourceUrl: true,
        sourceVerifiedAt: true,
        isActive: true,
        version: true
      }
    }),
    prisma.salaryComponentDefinition.findMany({
      where: { tenantId },
      orderBy: [{ archivedAt: 'asc' }, { calculationOrder: 'asc' }]
    })
  ])
  return {
    configurations,
    ruleSets,
    components,
    warning: ruleSets.some((rule) => rule.isActive && rule.verificationStatus === 'VERIFIED')
      ? null
      : 'Aucune configuration légale active et vérifiée. La validation et la clôture seront bloquées.'
  }
}

export async function upsertPayrollConfiguration(
  input: {
    id?: string
    version?: number
    name: string
    standardMonthlyMinutes: number
    standardWeeklyMinutes: number
    prorationMethod: string
    paymentDay: number
    attendanceCutoffDay: number
    leaveCutoffDay: number
    overtimeRules?: Record<string, unknown>
    accountingMappings?: Record<string, unknown>
    bankExportConfiguration?: Record<string, unknown>
    effectiveFrom: string
    effectiveTo?: string | null
    isActive?: boolean
  },
  actor: UserPublic
) {
  const tenantId = tenantOf(actor)
  const data = {
    name: input.name.trim(),
    standardMonthlyMinutes: input.standardMonthlyMinutes,
    standardWeeklyMinutes: input.standardWeeklyMinutes,
    prorationMethod: input.prorationMethod,
    paymentDay: input.paymentDay,
    attendanceCutoffDay: input.attendanceCutoffDay,
    leaveCutoffDay: input.leaveCutoffDay,
    overtimeRules: (input.overtimeRules || {}) as Prisma.InputJsonValue,
    accountingMappings: (input.accountingMappings || {}) as Prisma.InputJsonValue,
    bankExportConfiguration: (input.bankExportConfiguration || {}) as Prisma.InputJsonValue,
    effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
    effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T23:59:59.999Z`) : null,
    isActive: input.isActive || false
  }
  if (!input.id) return prisma.payrollConfiguration.create({ data: { tenantId, ...data, createdById: actor.id } })
  const current = await prisma.payrollConfiguration.findFirst({ where: { id: input.id, tenantId } })
  if (!current) fail('Configuration de paie introuvable.', 404)
  if (current.version !== input.version) fail('Cette configuration a été modifiée. Actualisez la page.', 409)
  return prisma.payrollConfiguration.update({
    where: { id: current.id },
    data: { ...data, updatedById: actor.id, version: { increment: 1 } }
  })
}

export async function createStatutoryRuleSet(
  input: {
    name: string
    effectiveFrom: string
    effectiveTo?: string | null
    officialSourceName?: string | null
    officialSourceUrl?: string | null
    sourceVerifiedAt?: string | null
    contributionRules: unknown
    incomeTaxBrackets: unknown
    professionalExpenses?: Record<string, unknown>
    exemptions?: unknown[]
  },
  actor: UserPublic
) {
  const tenantId = tenantOf(actor)
  const contributions = z.array(contributionRuleSchema).parse(input.contributionRules)
  const brackets = z.array(taxBracketSchema).parse(input.incomeTaxBrackets)
  return prisma.statutoryPayrollRuleSet.create({
    data: {
      tenantId,
      name: input.name.trim(),
      effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
      effectiveTo: input.effectiveTo ? new Date(`${input.effectiveTo}T23:59:59.999Z`) : null,
      officialSourceName: input.officialSourceName?.trim() || null,
      officialSourceUrl: input.officialSourceUrl?.trim() || null,
      sourceVerifiedAt: input.sourceVerifiedAt ? new Date(`${input.sourceVerifiedAt}T00:00:00.000Z`) : null,
      contributionRules: contributions as Prisma.InputJsonValue,
      incomeTaxBrackets: brackets as Prisma.InputJsonValue,
      professionalExpenses: (input.professionalExpenses || {}) as Prisma.InputJsonValue,
      exemptions: (input.exemptions || []) as Prisma.InputJsonValue,
      verificationStatus: 'UNVERIFIED',
      isActive: false,
      createdById: actor.id
    }
  })
}

export async function verifyAndActivateRuleSet(
  id: string,
  input: {
    version: number
    confirmation: string
    officialSourceName: string
    officialSourceUrl: string
    verificationDate: string
  },
  actor: UserPublic
) {
  if (actor.role !== 'SUPER_ADMIN') fail('Seul le Super Admin peut activer une configuration légale.', 403)
  if (input.confirmation !== 'ACTIVER LES RÈGLES DE PAIE') fail('Saisissez exactement « ACTIVER LES RÈGLES DE PAIE ».')
  const tenantId = tenantOf(actor)
  return prisma.$transaction(async (tx) => {
    const current = await tx.statutoryPayrollRuleSet.findFirst({ where: { id, tenantId } })
    if (!current) fail('Configuration légale introuvable.', 404)
    if (current.version !== input.version) fail('Cette configuration a été modifiée.', 409)
    if (!input.officialSourceName.trim() || !/^https:\/\//.test(input.officialSourceUrl))
      fail('Une source officielle HTTPS et sa date de vérification sont obligatoires.')
    await tx.statutoryPayrollRuleSet.updateMany({
      where: { tenantId, countryCode: current.countryCode, isActive: true },
      data: { isActive: false, version: { increment: 1 }, updatedById: actor.id }
    })
    return tx.statutoryPayrollRuleSet.update({
      where: { id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedById: actor.id,
        officialSourceName: input.officialSourceName.trim(),
        officialSourceUrl: input.officialSourceUrl,
        sourceVerifiedAt: new Date(`${input.verificationDate}T00:00:00.000Z`),
        isActive: true,
        activatedAt: new Date(),
        activatedById: actor.id,
        updatedById: actor.id,
        version: { increment: 1 }
      }
    })
  })
}

export async function createSalaryComponent(
  input: {
    code: string
    name: string
    description?: string
    kind: PayrollComponentKind
    mode: PayrollComponentMode
    taxable?: boolean
    cnssApplicable?: boolean
    amoApplicable?: boolean
    includedInGross?: boolean
    includedInNet?: boolean
    employeeSide?: boolean
    calculationOrder: number
    debitAccount?: string
    creditAccount?: string
    effectiveFrom: string
  },
  actor: UserPublic
) {
  const tenantId = tenantOf(actor)
  return prisma.salaryComponentDefinition.create({
    data: {
      tenantId,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      kind: input.kind,
      mode: input.mode,
      taxable: input.taxable || false,
      cnssApplicable: input.cnssApplicable || false,
      amoApplicable: input.amoApplicable || false,
      includedInGross: input.includedInGross || false,
      includedInNet: input.includedInNet ?? true,
      employeeSide: input.employeeSide ?? true,
      calculationOrder: input.calculationOrder,
      debitAccount: input.debitAccount?.trim() || null,
      creditAccount: input.creditAccount?.trim() || null,
      effectiveFrom: new Date(`${input.effectiveFrom}T00:00:00.000Z`),
      createdById: actor.id
    }
  })
}

export async function assignEmployeeSalaryComponent(
  input: {
    employeeId: string
    componentDefinitionId: string
    sourceContractId?: string | null
    fixedAmount?: string | null
    percentage?: string | null
    calculationBase?: string | null
    effectiveFrom: string
    effectiveTo?: string | null
    reason: string
  },
  actor: UserPublic
) {
  const tenantId = tenantOf(actor)
  const start = new Date(`${input.effectiveFrom}T00:00:00.000Z`)
  const end = input.effectiveTo ? new Date(`${input.effectiveTo}T23:59:59.999Z`) : null
  if (end && end < start) fail('La date de fin doit suivre la date de début.')
  const [employee, component, overlap] = await Promise.all([
    prisma.employee.findFirst({ where: { id: input.employeeId, tenantId, archivedAt: null } }),
    prisma.salaryComponentDefinition.findFirst({
      where: { id: input.componentDefinitionId, tenantId, archivedAt: null }
    }),
    prisma.employeeSalaryComponent.findFirst({
      where: {
        tenantId,
        employeeId: input.employeeId,
        componentDefinitionId: input.componentDefinitionId,
        effectiveFrom: { lte: end || new Date('9999-12-31T00:00:00Z') },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }]
      }
    })
  ])
  if (!employee || !component) fail('Employé ou composant introuvable dans cette organisation.', 404)
  if (overlap) fail('Une période effective conflictuelle existe déjà pour ce composant salarié.', 409)
  if (!input.fixedAmount && !input.percentage) fail('Un montant fixe ou un pourcentage est obligatoire.')
  return prisma.employeeSalaryComponent.create({
    data: {
      tenantId,
      employeeId: employee.id,
      componentDefinitionId: component.id,
      sourceContractId: input.sourceContractId || null,
      fixedAmount: input.fixedAmount ? new Prisma.Decimal(input.fixedAmount) : null,
      percentage: input.percentage ? new Prisma.Decimal(input.percentage) : null,
      calculationBase: input.calculationBase?.trim() || null,
      effectiveFrom: start,
      effectiveTo: end,
      reason: input.reason.trim(),
      createdById: actor.id
    }
  })
}
