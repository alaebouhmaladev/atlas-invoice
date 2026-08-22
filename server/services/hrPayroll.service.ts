import { createHash } from 'node:crypto'
import Decimal from 'decimal.js'
import { z } from 'zod'
import { PayrollVariableStatus, Prisma } from '@prisma/client'
import type { UserPublic } from '../../types/auth'
import { prisma } from '../utils/db'
import { decryptSensitiveField, maskRib } from '../utils/hrEncryption'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import { calculatePayroll, contributionRuleSchema, taxBracketSchema, type PayrollEngineLine } from './hrPayrollEngine'

const tenantOf = (actor: UserPublic) => actor.tenantId || 'default-tenant'
const asDate = (value: string | Date) => (value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`))
const hashJson = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const effectiveContractStatuses = ['ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED'] as const

export function calculateContractSalaryBasis<
  T extends { startDate: Date; endDate: Date | null; salarySnapshot: Decimal }
>(
  contracts: T[],
  periodStart: Date,
  periodEnd: Date,
  scheduledMinutes: number
) {
  const periodMs = periodEnd.getTime() - periodStart.getTime() + 1
  const segments = contracts
    .map((contract) => {
      const start = contract.startDate > periodStart ? contract.startDate : periodStart
      const end = contract.endDate && contract.endDate < periodEnd ? contract.endDate : periodEnd
      const overlapMs = Math.max(0, end.getTime() - start.getTime() + 1)
      const eligibleMinutes = Math.round(scheduledMinutes * Math.min(1, overlapMs / periodMs))
      return { contract, start, end, eligibleMinutes }
    })
    .filter((segment) => segment.eligibleMinutes > 0)
  const eligibleMinutes = Math.min(
    scheduledMinutes,
    segments.reduce((sum, segment) => sum + segment.eligibleMinutes, 0)
  )
  if (!segments.length || eligibleMinutes <= 0) throw new Error('MISSING_EFFECTIVE_CONTRACT')
  const weightedSalary = segments
    .reduce(
      (sum, segment) => sum.plus(segment.contract.salarySnapshot.mul(segment.eligibleMinutes)),
      new Decimal(0)
    )
    .div(segments.reduce((sum, segment) => sum + segment.eligibleMinutes, 0))
  return { segments, eligibleMinutes, weightedSalary }
}

function payrollError(message: string, statusCode = 400, code = 'PAYROLL_ERROR'): never {
  const error = new Error(message) as Error & { statusCode: number; data: { code: string; message: string } }
  error.statusCode = statusCode
  error.data = { code, message }
  throw error
}

export async function listPayrollPeriods(actor: UserPublic) {
  const tenantId = tenantOf(actor)
  return prisma.payrollPeriod.findMany({
    where: { tenantId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: { _count: { select: { records: true, variables: true } } }
  })
}

export async function getPayrollPeriod(periodId: string, actor: UserPublic) {
  const tenantId = tenantOf(actor)
  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, tenantId },
    include: {
      statutoryRuleSet: {
        select: { id: true, name: true, verificationStatus: true, isActive: true, sourceVerifiedAt: true }
      },
      records: {
        orderBy: { employeeNameSnapshot: 'asc' },
        include: { lines: { orderBy: { calculationOrder: 'asc' } } }
      },
      runs: { orderBy: { runNumber: 'desc' }, take: 10 },
      histories: { orderBy: { createdAt: 'desc' }, take: 50 }
    }
  })
  if (!period) payrollError('Période de paie introuvable.', 404, 'PAYROLL_PERIOD_NOT_FOUND')
  return period
}

export async function createPayrollPeriod(
  input: {
    year: number
    month: number
    paymentDate: string
    statutoryRuleSetId?: string | null
    payrollConfigurationId?: string | null
  },
  actor: UserPublic,
  requestId: string
) {
  const tenantId = tenantOf(actor)
  if (input.month < 1 || input.month > 12) payrollError('Le mois de paie est invalide.')
  const periodStart = new Date(Date.UTC(input.year, input.month - 1, 1))
  const periodEnd = new Date(Date.UTC(input.year, input.month, 0, 23, 59, 59, 999))
  if (input.statutoryRuleSetId) {
    const scoped = await prisma.statutoryPayrollRuleSet.count({ where: { id: input.statutoryRuleSetId, tenantId } })
    if (!scoped) payrollError('Configuration légale introuvable dans cette organisation.', 404)
  }
  const period = await prisma.payrollPeriod.create({
    data: {
      tenantId,
      periodNumber: `PAIE-${input.year}-${String(input.month).padStart(2, '0')}`,
      name: `Paie ${new Intl.DateTimeFormat('fr-MA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(periodStart)}`,
      year: input.year,
      month: input.month,
      periodStart,
      periodEnd,
      paymentDate: asDate(input.paymentDate),
      statutoryRuleSetId: input.statutoryRuleSetId || null,
      payrollConfigurationId: input.payrollConfigurationId || null,
      createdById: actor.id
    }
  })
  await prisma.payrollHistory.create({
    data: {
      tenantId,
      periodId: period.id,
      action: 'CREATED',
      actorId: actor.id,
      actorNameSnapshot: actor.name,
      actorRoleSnapshot: actor.role,
      requestId
    }
  })
  await createAuditEntry({
    userId: actor.id,
    actorDisplayNameSnapshot: actor.name,
    actorRoleSnapshot: actor.role,
    action: 'HR_PAYROLL_PERIOD_CREATED',
    category: 'HR_PAYROLL',
    entityType: 'PayrollPeriod',
    entityId: period.id,
    requestId,
    metadata: { year: input.year, month: input.month }
  })
  return period
}

export async function inspectPayrollReadiness(periodId: string, actor: UserPublic) {
  const tenantId = tenantOf(actor)
  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, tenantId },
    include: { statutoryRuleSet: true }
  })
  if (!period) payrollError('Période de paie introuvable.', 404)
  const employees = await prisma.employee.findMany({
    where: {
      tenantId,
      archivedAt: null,
      employmentStatus: { in: ['ACTIVE', 'ONBOARDING', 'SUSPENDED', 'DEPARTED'] },
      hireDate: { lte: period.periodEnd },
      OR: [{ departureDate: null }, { departureDate: { gte: period.periodStart } }]
    },
    select: { id: true, displayName: true }
  })
  const blockers: Array<{ code: string; employeeId?: string; message: string }> = []
  const warnings: Array<{ code: string; employeeId?: string; message: string }> = []
  if (
    !period.statutoryRuleSet ||
    period.statutoryRuleSet.verificationStatus !== 'VERIFIED' ||
    !period.statutoryRuleSet.isActive
  ) {
    blockers.push({
      code: 'UNVERIFIED_STATUTORY_RULES',
      message: 'Aucune configuration légale active et vérifiée n’est associée à la période.'
    })
  }
  const configuration = await prisma.payrollConfiguration.findFirst({
    where: {
      tenantId,
      isActive: true,
      effectiveFrom: { lte: period.periodEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.periodStart } }]
    }
  })
  if (!configuration)
    blockers.push({
      code: 'MISSING_PAYROLL_CONFIGURATION',
      message: 'Aucune configuration de paie active ne couvre cette période.'
    })

  for (const employee of employees) {
    const contract = await prisma.employmentContract.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        status: { in: [...effectiveContractStatuses] },
        startDate: { lte: period.periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: period.periodStart } }]
      }
    })
    if (!contract)
      blockers.push({
        code: 'MISSING_EFFECTIVE_CONTRACT',
        employeeId: employee.id,
        message: `Contrat effectif manquant pour ${employee.displayName}.`
      })
    const days = await prisma.attendanceDay.findMany({
      where: { tenantId, employeeId: employee.id, workDate: { gte: period.periodStart, lte: period.periodEnd } },
      select: { validationStatus: true, overtimeMinutes: true }
    })
    if (!days.length || days.some((day) => day.validationStatus !== 'APPROVED'))
      blockers.push({
        code: 'UNVALIDATED_ATTENDANCE',
        employeeId: employee.id,
        message: `Pointage absent ou non validé pour ${employee.displayName}.`
      })
    if (days.some((day) => day.overtimeMinutes > 0))
      warnings.push({
        code: 'OVERTIME_REQUIRES_APPROVED_VARIABLE',
        employeeId: employee.id,
        message: `Les heures supplémentaires de ${employee.displayName} ne seront payées que via une variable approuvée.`
      })
  }
  return { periodId, eligibleEmployeeCount: employees.length, blockers, warnings, ready: blockers.length === 0 }
}

function engineLineFromComponent(
  component: {
    componentDefinition: {
      code: string
      name: string
      kind: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION' | 'REIMBURSEMENT'
      taxable: boolean
      cnssApplicable: boolean
      amoApplicable: boolean
      calculationOrder: number
    }
    fixedAmount?: Prisma.Decimal | null
    amount?: Prisma.Decimal
    id: string
  },
  source: string
): PayrollEngineLine {
  const amount = new Decimal(component.fixedAmount?.toString() || component.amount?.toString() || 0)
  return {
    code: component.componentDefinition.code,
    name: component.componentDefinition.name,
    kind: component.componentDefinition.kind,
    amount,
    employeeAmount: component.componentDefinition.kind === 'EMPLOYER_CONTRIBUTION' ? new Decimal(0) : amount,
    employerAmount: component.componentDefinition.kind === 'EMPLOYER_CONTRIBUTION' ? amount : new Decimal(0),
    taxable: component.componentDefinition.taxable,
    contributionApplicable: component.componentDefinition.cnssApplicable || component.componentDefinition.amoApplicable,
    order: component.componentDefinition.calculationOrder,
    source,
    sourceEntityId: component.id,
    explanation: { source }
  }
}

export async function calculatePayrollPeriod(periodId: string, actor: UserPublic, requestId: string) {
  const tenantId = tenantOf(actor)
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${periodId}:payroll`}, 0))`
      const period = await tx.payrollPeriod.findFirst({
        where: { id: periodId, tenantId },
        include: { statutoryRuleSet: true }
      })
      if (!period) payrollError('Période de paie introuvable.', 404)
      if (['VALIDATED', 'CLOSED', 'CANCELLED'].includes(period.status))
        payrollError('Cette période ne peut plus être recalculée.', 409, 'PAYROLL_PERIOD_IMMUTABLE')
      const configuration = await tx.payrollConfiguration.findFirst({
        where: {
          tenantId,
          isActive: true,
          effectiveFrom: { lte: period.periodEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.periodStart } }]
        }
      })
      if (!configuration)
        payrollError(
          'Aucune configuration de paie active ne couvre cette période.',
          422,
          'PAYROLL_CONFIGURATION_MISSING'
        )
      const rules = period.statutoryRuleSet
      if (!rules)
        payrollError('Associez une configuration légale à la période avant le calcul.', 422, 'STATUTORY_RULES_MISSING')
      const contributions = zArray(contributionRuleSchema, rules.contributionRules)
      const brackets = zArray(taxBracketSchema, rules.incomeTaxBrackets)
      const expenses = (rules.professionalExpenses || {}) as Record<string, unknown>
      const employees = await tx.employee.findMany({
        where: {
          tenantId,
          archivedAt: null,
          hireDate: { lte: period.periodEnd },
          OR: [{ departureDate: null }, { departureDate: { gte: period.periodStart } }]
        }
      })
      const runNumber = (await tx.payrollCalculationRun.count({ where: { tenantId, periodId } })) + 1
      const run = await tx.payrollCalculationRun.create({
        data: {
          tenantId,
          periodId,
          runNumber,
          status: 'RUNNING',
          startedById: actor.id,
          employeeCount: employees.length
        }
      })
      await tx.payrollPeriod.update({
        where: { id: period.id },
        data: { status: 'CALCULATING', version: { increment: 1 }, updatedById: actor.id }
      })
      let successCount = 0
      const failures: Array<{ employeeId: string; code: string }> = []
      const outputHashes: string[] = []

      for (const employee of employees) {
        try {
          const contracts = await tx.employmentContract.findMany({
            where: {
              tenantId,
              employeeId: employee.id,
              status: { in: [...effectiveContractStatuses] },
              startDate: { lte: period.periodEnd },
              OR: [{ endDate: null }, { endDate: { gte: period.periodStart } }]
            },
            orderBy: { startDate: 'asc' }
          })
          if (!contracts.length) throw new Error('MISSING_EFFECTIVE_CONTRACT')
          const contract = contracts[contracts.length - 1]!
          const assignment = await tx.employeeAssignment.findFirst({
            where: {
              tenantId,
              employeeId: employee.id,
              startDate: { lte: period.periodEnd },
              OR: [{ endDate: null }, { endDate: { gte: period.periodStart } }]
            },
            include: { site: true, department: true, position: true },
            orderBy: { startDate: 'desc' }
          })
          const attendance = await tx.attendanceDay.findMany({
            where: { tenantId, employeeId: employee.id, workDate: { gte: period.periodStart, lte: period.periodEnd } }
          })
          if (!attendance.length || attendance.some((day) => day.validationStatus !== 'APPROVED'))
            throw new Error('UNVALIDATED_ATTENDANCE')
          const leaves = await tx.leaveRequest.findMany({
            where: {
              tenantId,
              employeeId: employee.id,
              status: 'APPROVED',
              startDate: { lte: period.periodEnd },
              endDate: { gte: period.periodStart }
            },
            include: {
              leaveType: true,
              days: { where: { localDate: { gte: period.periodStart, lte: period.periodEnd } } }
            }
          })
          const scheduledMinutes =
            attendance.reduce((sum, day) => sum + day.plannedMinutes, 0) || configuration.standardMonthlyMinutes
          const salaryBasis = calculateContractSalaryBasis(
            contracts,
            period.periodStart,
            period.periodEnd,
            scheduledMinutes
          )
          const eligibleMinutes = salaryBasis.eligibleMinutes
          const unpaidLeaveMinutes = leaves
            .filter((leave) => !leave.leaveType.isPaid)
            .reduce((sum, leave) => sum + leave.days.reduce((daySum, day) => daySum + day.requestedMinutes, 0), 0)
          const paidLeaveMinutes = leaves
            .filter((leave) => leave.leaveType.isPaid)
            .reduce((sum, leave) => sum + leave.days.reduce((daySum, day) => daySum + day.requestedMinutes, 0), 0)
          const rawMissing = attendance.reduce((sum, day) => sum + day.missingMinutes, 0)
          const missingMinutes = Math.max(0, rawMissing - unpaidLeaveMinutes)
          const recurring = await tx.employeeSalaryComponent.findMany({
            where: {
              tenantId,
              employeeId: employee.id,
              effectiveFrom: { lte: period.periodEnd },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.periodStart } }]
            },
            include: { componentDefinition: true }
          })
          const variables = await tx.payrollVariable.findMany({
            where: { tenantId, periodId, employeeId: employee.id, status: 'APPROVED' },
            include: { componentDefinition: true }
          })
          const result = calculatePayroll({
            baseSalary: salaryBasis.weightedSalary.toString(),
            scheduledMinutes,
            eligibleMinutes,
            workedMinutes: attendance.reduce((sum, day) => sum + day.netWorkedMinutes, 0),
            paidLeaveMinutes,
            unpaidLeaveMinutes,
            missingMinutes,
            recurringLines: recurring.map((item) => engineLineFromComponent(item, 'RECURRING_COMPONENT')),
            variableLines: variables.map((item) => engineLineFromComponent(item, 'APPROVED_VARIABLE')),
            contributionRules: contributions,
            incomeTaxBrackets: brackets,
            professionalExpenseRate: typeof expenses.rate === 'string' ? expenses.rate : 0,
            professionalExpenseCeiling: typeof expenses.ceiling === 'string' ? expenses.ceiling : null,
            prorationMethod: configuration.prorationMethod
          })
          const rib = decryptSensitiveField(employee.ribEncrypted)
          const sourceSnapshot = {
            contractId: contract.id,
            contractVersion: contract.version,
            siteId: assignment?.siteId || contract.siteId || attendance[0]?.siteId || null,
            attendanceDayIds: attendance.map((day) => day.id),
            leaveRequestIds: leaves.map((leave) => leave.id),
            variableIds: variables.map((item) => item.id),
            ruleSetId: rules.id,
            ruleSetVersion: rules.version,
            configurationId: configuration.id,
            configurationVersion: configuration.version
          }
          const record = await tx.payrollRecord.upsert({
            where: { tenantId_periodId_employeeId: { tenantId, periodId, employeeId: employee.id } },
            create: {
              tenantId,
              periodId,
              employeeId: employee.id,
              employeeNumberSnapshot: employee.employeeNumber,
              employeeNameSnapshot: employee.displayName,
              siteSnapshot: assignment?.site?.name || contract.siteSnapshot,
              departmentSnapshot: assignment?.department?.name || contract.departmentSnapshot,
              positionSnapshot: assignment?.position?.title || contract.positionSnapshot,
              contractSnapshot: {
                id: contract.id,
                number: contract.contractNumber,
                type: contract.contractType,
                startDate: contract.startDate,
                endDate: contract.endDate,
                salary: salaryBasis.weightedSalary.toFixed(2),
                currency: contract.currency,
                version: contract.version,
                salarySegments: salaryBasis.segments.map((segment) => ({
                  contractId: segment.contract.id,
                  startDate: segment.start,
                  endDate: segment.end,
                  salary: segment.contract.salarySnapshot.toString(),
                  eligibleMinutes: segment.eligibleMinutes
                }))
              },
              bankSnapshotEncrypted: employee.ribEncrypted,
              bankMaskedSnapshot: maskRib(rib),
              baseSalarySnapshot: salaryBasis.weightedSalary,
              workedTimeSnapshot: {
                scheduledMinutes,
                workedMinutes: attendance.reduce((sum, day) => sum + day.netWorkedMinutes, 0),
                attendanceValidated: true
              },
              leaveSnapshot: { paidLeaveMinutes, unpaidLeaveMinutes, requestIds: leaves.map((leave) => leave.id) },
              sourceSnapshot,
              prorationMethod: configuration.prorationMethod,
              grossSalary: result.grossSalary,
              taxableGross: result.taxableGross,
              contributionBase: result.contributionBase,
              employeeContributions: result.employeeContributions,
              employerContributions: result.employerContributions,
              taxableNet: result.taxableNet,
              incomeTax: result.incomeTax,
              totalDeductions: result.totalDeductions,
              netPayable: result.netPayable,
              employerCost: result.employerCost,
              status: 'CALCULATED',
              calculationHash: result.calculationHash,
              calculatedAt: new Date()
            },
            update: {
              employeeNumberSnapshot: employee.employeeNumber,
              employeeNameSnapshot: employee.displayName,
              siteSnapshot: assignment?.site?.name || contract.siteSnapshot,
              departmentSnapshot: assignment?.department?.name || contract.departmentSnapshot,
              positionSnapshot: assignment?.position?.title || contract.positionSnapshot,
              contractSnapshot: {
                id: contract.id,
                number: contract.contractNumber,
                type: contract.contractType,
                startDate: contract.startDate,
                endDate: contract.endDate,
                salary: salaryBasis.weightedSalary.toFixed(2),
                currency: contract.currency,
                version: contract.version,
                salarySegments: salaryBasis.segments.map((segment) => ({
                  contractId: segment.contract.id,
                  startDate: segment.start,
                  endDate: segment.end,
                  salary: segment.contract.salarySnapshot.toString(),
                  eligibleMinutes: segment.eligibleMinutes
                }))
              },
              bankSnapshotEncrypted: employee.ribEncrypted,
              bankMaskedSnapshot: maskRib(rib),
              baseSalarySnapshot: salaryBasis.weightedSalary,
              workedTimeSnapshot: {
                scheduledMinutes,
                workedMinutes: attendance.reduce((sum, day) => sum + day.netWorkedMinutes, 0),
                attendanceValidated: true
              },
              leaveSnapshot: { paidLeaveMinutes, unpaidLeaveMinutes, requestIds: leaves.map((leave) => leave.id) },
              sourceSnapshot,
              prorationMethod: configuration.prorationMethod,
              grossSalary: result.grossSalary,
              taxableGross: result.taxableGross,
              contributionBase: result.contributionBase,
              employeeContributions: result.employeeContributions,
              employerContributions: result.employerContributions,
              taxableNet: result.taxableNet,
              incomeTax: result.incomeTax,
              totalDeductions: result.totalDeductions,
              netPayable: result.netPayable,
              employerCost: result.employerCost,
              status: 'CALCULATED',
              calculationHash: result.calculationHash,
              calculatedAt: new Date(),
              version: { increment: 1 }
            }
          })
          await tx.payrollLine.deleteMany({ where: { tenantId, recordId: record.id } })
          await tx.payrollLine.createMany({
            data: result.lines.map((line) => ({
              tenantId,
              recordId: record.id,
              componentCodeSnapshot: line.code,
              componentNameSnapshot: line.name,
              kind: line.kind,
              quantity: null,
              rate: null,
              calculationBase: null,
              employeeAmount: line.employeeAmount,
              employerAmount: line.employerAmount,
              taxable: line.taxable,
              cnssApplicable: line.contributionApplicable,
              amoApplicable: line.contributionApplicable,
              source: line.source,
              sourceEntityId: line.sourceEntityId,
              calculationOrder: line.order,
              calculationExplanation: line.explanation as Prisma.InputJsonValue
            }))
          })
          outputHashes.push(result.calculationHash)
          successCount++
        } catch (error) {
          failures.push({
            employeeId: employee.id,
            code: error instanceof Error ? error.message : 'CALCULATION_FAILED'
          })
        }
      }
      const outputHash = hashJson(outputHashes.sort())
      await tx.payrollCalculationRun.update({
        where: { id: run.id },
        data: {
          status: failures.length === 0 ? 'SUCCEEDED' : successCount ? 'PARTIAL' : 'FAILED',
          finishedAt: new Date(),
          successCount,
          failureCount: failures.length,
          outputHash,
          errorSummary: failures
        }
      })
      await tx.payrollPeriod.update({
        where: { id: period.id },
        data: {
          status: failures.length === 0 ? 'CALCULATED' : 'DRAFT',
          calculatedAt: new Date(),
          outputHash,
          calculationVersion: { increment: 1 },
          version: { increment: 1 },
          updatedById: actor.id
        }
      })
      await tx.payrollHistory.create({
        data: {
          tenantId,
          periodId,
          action: 'CALCULATED',
          actorId: actor.id,
          actorNameSnapshot: actor.name,
          actorRoleSnapshot: actor.role,
          requestId,
          afterSnapshot: {
            runId: run.id,
            employeeCount: employees.length,
            successCount,
            failureCount: failures.length,
            outputHash
          }
        }
      })
      return {
        runId: run.id,
        employeeCount: employees.length,
        successCount,
        failureCount: failures.length,
        failures,
        outputHash
      }
    },
    { maxWait: 10_000, timeout: 180_000 }
  )
}

function zArray<T extends z.ZodTypeAny>(schema: T, value: Prisma.JsonValue): z.infer<T>[] {
  return z.array(schema).parse(value)
}

async function assertVerifiedRules(
  tx: Prisma.TransactionClient,
  period: { id: string; tenantId: string; periodStart: Date; periodEnd: Date; statutoryRuleSetId: string | null }
) {
  const rules = period.statutoryRuleSetId
    ? await tx.statutoryPayrollRuleSet.findFirst({
        where: {
          id: period.statutoryRuleSetId,
          tenantId: period.tenantId,
          isActive: true,
          verificationStatus: 'VERIFIED',
          effectiveFrom: { lte: period.periodEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.periodStart } }]
        }
      })
    : null
  if (!rules)
    payrollError('La clôture exige une configuration légale active et vérifiée.', 422, 'UNVERIFIED_STATUTORY_RULES')
  const records = await tx.payrollRecord.count({ where: { tenantId: period.tenantId, periodId: period.id } })
  if (!records) payrollError('Aucun bulletin calculé pour cette période.', 422)
}

async function assertClosingReadiness(
  tx: Prisma.TransactionClient,
  period: { id: string; tenantId: string; periodStart: Date; periodEnd: Date; statutoryRuleSetId: string | null }
) {
  await assertVerifiedRules(tx, period)
  const records = await tx.payrollRecord.findMany({
    where: { tenantId: period.tenantId, periodId: period.id },
    select: { sourceSnapshot: true }
  })
  const siteIds = [
    ...new Set(
      records
        .map((record) =>
          typeof record.sourceSnapshot === 'object' && record.sourceSnapshot && !Array.isArray(record.sourceSnapshot)
            ? String((record.sourceSnapshot as Record<string, unknown>).siteId || '')
            : ''
        )
        .filter(Boolean)
    )
  ]
  for (const siteId of siteIds) {
    const locked = await tx.attendancePeriodLock.count({
      where: {
        tenantId: period.tenantId,
        siteId,
        isLocked: true,
        periodStart: { lte: period.periodStart },
        periodEnd: { gte: period.periodEnd }
      }
    })
    if (!locked)
      payrollError(
        'Le pointage de chaque site concerné doit être verrouillé pour toute la période.',
        422,
        'ATTENDANCE_NOT_LOCKED'
      )
  }
  const critical = await tx.attendanceAnomaly.count({
    where: {
      tenantId: period.tenantId,
      isResolved: false,
      severity: 'CRITICAL',
      attendanceDay: { workDate: { gte: period.periodStart, lte: period.periodEnd } }
    }
  })
  if (critical)
    payrollError('Des anomalies critiques de pointage restent non résolues.', 422, 'CRITICAL_ATTENDANCE_ANOMALIES')
}

export async function validatePayrollPeriod(
  periodId: string,
  confirmation: string,
  version: number,
  actor: UserPublic,
  requestId: string
) {
  if (confirmation !== 'VALIDER LA PAIE') payrollError('Saisissez exactement « VALIDER LA PAIE ».')
  const tenantId = tenantOf(actor)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${periodId}:payroll`}, 0))`
    const period = await tx.payrollPeriod.findFirst({ where: { id: periodId, tenantId } })
    if (!period) payrollError('Période de paie introuvable.', 404)
    if (period.status === 'VALIDATED') return period
    if (period.status !== 'CALCULATED' || period.version !== version)
      payrollError('La période a changé ou n’est pas calculée.', 409, 'OPTIMISTIC_CONCURRENCY')
    await assertVerifiedRules(tx, period)
    await tx.payrollRecord.updateMany({
      where: { tenantId, periodId, status: 'CALCULATED' },
      data: { status: 'VALIDATED' }
    })
    const updated = await tx.payrollPeriod.update({
      where: { id: period.id },
      data: {
        status: 'VALIDATED',
        validatedAt: new Date(),
        validatedById: actor.id,
        version: { increment: 1 },
        updatedById: actor.id
      }
    })
    await tx.payrollHistory.create({
      data: {
        tenantId,
        periodId,
        action: 'VALIDATED',
        actorId: actor.id,
        actorNameSnapshot: actor.name,
        actorRoleSnapshot: actor.role,
        requestId,
        afterSnapshot: { outputHash: period.outputHash }
      }
    })
    return updated
  })
}

export async function closePayrollPeriod(
  periodId: string,
  confirmation: string,
  version: number,
  actor: UserPublic,
  requestId: string
) {
  if (confirmation !== 'CLÔTURER LA PAIE') payrollError('Saisissez exactement « CLÔTURER LA PAIE ».')
  const tenantId = tenantOf(actor)
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${periodId}:payroll`}, 0))`
    const period = await tx.payrollPeriod.findFirst({ where: { id: periodId, tenantId } })
    if (!period) payrollError('Période de paie introuvable.', 404)
    if (period.status === 'CLOSED') return period
    if (period.status !== 'VALIDATED' || period.version !== version)
      payrollError('La période a changé ou n’est pas validée.', 409, 'OPTIMISTIC_CONCURRENCY')
    await assertClosingReadiness(tx, period)
    const hashes = await tx.payrollRecord.findMany({ where: { tenantId, periodId }, select: { calculationHash: true } })
    if (hashJson(hashes.map((item) => item.calculationHash).sort()) !== period.outputHash)
      payrollError(
        'Les empreintes de calcul ne correspondent plus. Recalculez la période.',
        409,
        'CALCULATION_HASH_MISMATCH'
      )
    await tx.payrollVariable.updateMany({
      where: { tenantId, periodId, status: 'APPROVED' },
      data: { status: 'LOCKED' }
    })
    await tx.payrollRecord.updateMany({
      where: { tenantId, periodId, status: 'VALIDATED' },
      data: { status: 'CLOSED' }
    })
    const updated = await tx.payrollPeriod.update({
      where: { id: period.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedById: actor.id,
        version: { increment: 1 },
        updatedById: actor.id
      }
    })
    await tx.payrollHistory.create({
      data: {
        tenantId,
        periodId,
        action: 'CLOSED',
        actorId: actor.id,
        actorNameSnapshot: actor.name,
        actorRoleSnapshot: actor.role,
        requestId,
        calculationHash: period.outputHash,
        afterSnapshot: { recordCount: hashes.length }
      }
    })
    return updated
  })
  await createNotification({
    recipientRole: 'SUPER_ADMIN',
    type: 'PAYROLL_CLOSED',
    severity: 'SUCCESS',
    title: 'Paie clôturée',
    message: 'Une période de paie a été clôturée et figée.',
    actionUrl: `/rh/paie/periodes/${periodId}`,
    entityType: 'PayrollPeriod',
    entityId: periodId,
    deduplicationKey: `payroll:${tenantId}:${periodId}:closed:${result.version}`
  })
  return result
}

export async function reopenPayrollPeriod(
  periodId: string,
  confirmation: string,
  reason: string,
  version: number,
  actor: UserPublic,
  requestId: string
) {
  if (confirmation !== 'RÉOUVRIR LA PAIE') payrollError('Saisissez exactement « RÉOUVRIR LA PAIE ».')
  if (reason.trim().length < 20) payrollError('Un motif détaillé d’au moins 20 caractères est obligatoire.')
  const tenantId = tenantOf(actor)
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${periodId}:payroll`}, 0))`
    const period = await tx.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
      include: { records: { include: { lines: true } } }
    })
    if (!period) payrollError('Période de paie introuvable.', 404)
    if (period.status !== 'CLOSED' || period.version !== version)
      payrollError('Seule une période clôturée et non modifiée peut être rouverte.', 409)
    const preservedSnapshot = period.records.map((record) => ({
      ...record,
      bankSnapshotEncrypted: '[REDACTED]',
      lines: record.lines
    }))
    await tx.payrollRecord.updateMany({ where: { tenantId, periodId, status: 'CLOSED' }, data: { status: 'REVERSED' } })
    const updated = await tx.payrollPeriod.update({
      where: { id: period.id },
      data: {
        status: 'REOPENED',
        reopenedAt: new Date(),
        reopenedById: actor.id,
        reopeningReason: reason.trim(),
        version: { increment: 1 },
        calculationVersion: { increment: 1 },
        updatedById: actor.id
      }
    })
    await tx.payrollHistory.create({
      data: {
        tenantId,
        periodId,
        action: 'REOPENED',
        actorId: actor.id,
        actorNameSnapshot: actor.name,
        actorRoleSnapshot: actor.role,
        reason: reason.trim(),
        requestId,
        calculationHash: period.outputHash,
        beforeSnapshot: preservedSnapshot as Prisma.InputJsonValue,
        afterSnapshot: { status: 'REOPENED', version: updated.version }
      }
    })
    return updated
  })
  await createNotification({
    recipientRole: 'SUPER_ADMIN',
    type: 'PAYROLL_REOPENED',
    severity: 'CRITICAL',
    title: 'Paie rouverte',
    message: 'Une période de paie clôturée a été rouverte avec un motif enregistré.',
    actionUrl: `/rh/paie/periodes/${periodId}`,
    entityType: 'PayrollPeriod',
    entityId: periodId,
    deduplicationKey: `payroll:${tenantId}:${periodId}:reopened:${result.version}`
  })
  return result
}

export async function createPayrollVariable(
  input: {
    periodId: string
    employeeId: string
    componentDefinitionId: string
    amount: string
    quantity?: string
    rate?: string
    description?: string
    idempotencyKey: string
  },
  actor: UserPublic
) {
  const tenantId = tenantOf(actor)
  const [period, employee, component] = await Promise.all([
    prisma.payrollPeriod.findFirst({ where: { id: input.periodId, tenantId } }),
    prisma.employee.findFirst({ where: { id: input.employeeId, tenantId, archivedAt: null } }),
    prisma.salaryComponentDefinition.findFirst({
      where: { id: input.componentDefinitionId, tenantId, archivedAt: null }
    })
  ])
  if (!period || !employee || !component)
    payrollError('Période, employé ou composant introuvable dans cette organisation.', 404)
  if (!['DRAFT', 'REOPENED'].includes(period.status))
    payrollError('Les variables de cette période sont verrouillées.', 409)
  return prisma.payrollVariable.upsert({
    where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
    create: {
      tenantId,
      periodId: period.id,
      employeeId: employee.id,
      componentDefinitionId: component.id,
      amount: new Prisma.Decimal(input.amount),
      quantity: input.quantity ? new Prisma.Decimal(input.quantity) : null,
      rate: input.rate ? new Prisma.Decimal(input.rate) : null,
      source: 'MANUAL',
      description: input.description?.trim() || null,
      idempotencyKey: input.idempotencyKey,
      createdById: actor.id
    },
    update: {}
  })
}

export async function approvePayrollVariable(
  id: string,
  approve: boolean,
  reason: string | undefined,
  version: number,
  actor: UserPublic
) {
  const tenantId = tenantOf(actor)
  const variable = await prisma.payrollVariable.findFirst({ where: { id, tenantId }, include: { period: true } })
  if (!variable) payrollError('Variable de paie introuvable.', 404)
  const actorEmployee = await prisma.employee.findFirst({
    where: { tenantId, linkedUserId: actor.id },
    select: { id: true }
  })
  if (
    variable.createdById === actor.id ||
    variable.submittedById === actor.id ||
    actorEmployee?.id === variable.employeeId
  )
    payrollError(
      'Vous ne pouvez pas approuver votre propre variable ou une variable dont vous êtes bénéficiaire.',
      403,
      'SELF_APPROVAL_FORBIDDEN'
    )
  if (variable.version !== version || !['DRAFT', 'SUBMITTED'].includes(variable.status))
    payrollError('La variable a changé ou ne peut plus être révisée.', 409)
  if (!approve && (!reason || reason.trim().length < 5)) payrollError('Le motif du refus est obligatoire.')
  return prisma.payrollVariable.update({
    where: { id },
    data: {
      status: approve ? PayrollVariableStatus.APPROVED : PayrollVariableStatus.REJECTED,
      approvedById: approve ? actor.id : null,
      approvedAt: approve ? new Date() : null,
      rejectionReason: approve ? null : reason?.trim(),
      version: { increment: 1 },
      updatedById: actor.id
    }
  })
}
