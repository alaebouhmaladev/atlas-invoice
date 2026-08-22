import Decimal from 'decimal.js'
import { createHash } from 'node:crypto'
import { z } from 'zod'

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

const money = (value: Decimal.Value) => new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

export const contributionRuleSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  employeeRate: z.string().regex(/^\d+(\.\d+)?$/),
  employerRate: z.string().regex(/^\d+(\.\d+)?$/),
  ceiling: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .nullable()
    .optional(),
  calculationOrder: z.number().int().min(1).max(999).default(200)
})

export const taxBracketSchema = z.object({
  from: z.string().regex(/^\d+(\.\d+)?$/),
  to: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .nullable(),
  rate: z.string().regex(/^\d+(\.\d+)?$/)
})

export interface PayrollEngineLine {
  code: string
  name: string
  kind: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION' | 'REIMBURSEMENT'
  amount: Decimal
  employeeAmount: Decimal
  employerAmount: Decimal
  taxable: boolean
  contributionApplicable: boolean
  order: number
  source: string
  sourceEntityId?: string
  explanation: Record<string, unknown>
}

export interface PayrollEngineInput {
  baseSalary: Decimal.Value
  scheduledMinutes: number
  eligibleMinutes: number
  workedMinutes: number
  paidLeaveMinutes: number
  unpaidLeaveMinutes: number
  missingMinutes: number
  recurringLines: PayrollEngineLine[]
  variableLines: PayrollEngineLine[]
  contributionRules: z.input<typeof contributionRuleSchema>[]
  incomeTaxBrackets: z.input<typeof taxBracketSchema>[]
  professionalExpenseRate?: Decimal.Value
  professionalExpenseCeiling?: Decimal.Value | null
  prorationMethod: string
}

export interface PayrollEngineResult {
  lines: PayrollEngineLine[]
  grossSalary: Decimal
  taxableGross: Decimal
  contributionBase: Decimal
  employeeContributions: Decimal
  employerContributions: Decimal
  taxableNet: Decimal
  incomeTax: Decimal
  totalDeductions: Decimal
  netPayable: Decimal
  employerCost: Decimal
  calculationHash: string
}

export function calculateProgressiveTax(base: Decimal.Value, rawBrackets: z.input<typeof taxBracketSchema>[]): Decimal {
  const taxableBase = Decimal.max(0, new Decimal(base))
  const brackets = rawBrackets
    .map((bracket) => taxBracketSchema.parse(bracket))
    .sort((a, b) => new Decimal(a.from).comparedTo(b.from))
  let tax = new Decimal(0)

  for (const bracket of brackets) {
    const lower = new Decimal(bracket.from)
    if (taxableBase.lte(lower)) continue
    const upper = bracket.to === null ? taxableBase : Decimal.min(taxableBase, new Decimal(bracket.to))
    const slice = Decimal.max(0, upper.minus(lower))
    tax = tax.plus(slice.mul(new Decimal(bracket.rate)))
  }
  return money(tax)
}

export function calculateContribution(
  base: Decimal.Value,
  rate: Decimal.Value,
  ceiling?: Decimal.Value | null
): Decimal {
  const contributionBase =
    ceiling === null || ceiling === undefined
      ? Decimal.max(0, new Decimal(base))
      : Decimal.max(0, Decimal.min(base, ceiling))
  return money(contributionBase.mul(rate))
}

export function calculatePayroll(input: PayrollEngineInput): PayrollEngineResult {
  if (!Number.isInteger(input.scheduledMinutes) || input.scheduledMinutes <= 0)
    throw new Error('Les minutes planifiées doivent être strictement positives.')
  if (!Number.isInteger(input.eligibleMinutes) || input.eligibleMinutes < 0)
    throw new Error('Les minutes éligibles sont invalides.')

  const baseSalary = money(input.baseSalary)
  const proratedBase = money(baseSalary.mul(new Decimal(input.eligibleMinutes).div(input.scheduledMinutes)))
  const absenceMinutes = Math.max(0, input.unpaidLeaveMinutes + input.missingMinutes)
  const absenceDeduction = money(baseSalary.mul(new Decimal(absenceMinutes).div(input.scheduledMinutes)))

  const lines: PayrollEngineLine[] = [
    {
      code: 'SALAIRE_BASE',
      name: 'Salaire de base proratisé',
      kind: 'EARNING',
      amount: proratedBase,
      employeeAmount: proratedBase,
      employerAmount: new Decimal(0),
      taxable: true,
      contributionApplicable: true,
      order: 10,
      source: 'CONTRACT_SNAPSHOT',
      explanation: {
        method: input.prorationMethod,
        baseSalary: baseSalary.toFixed(2),
        eligibleMinutes: input.eligibleMinutes,
        scheduledMinutes: input.scheduledMinutes
      }
    }
  ]

  if (absenceDeduction.gt(0)) {
    lines.push({
      code: 'ABSENCE_NON_PAYEE',
      name: 'Absence non rémunérée',
      kind: 'DEDUCTION',
      amount: absenceDeduction,
      employeeAmount: absenceDeduction,
      employerAmount: new Decimal(0),
      taxable: false,
      contributionApplicable: false,
      order: 90,
      source: 'ATTENDANCE_LEAVE_DEDUPLICATED',
      explanation: {
        absenceMinutes,
        unpaidLeaveMinutes: input.unpaidLeaveMinutes,
        missingMinutes: input.missingMinutes
      }
    })
  }
  lines.push(...input.recurringLines, ...input.variableLines)

  const grossSalary = money(
    lines.filter((line) => line.kind === 'EARNING').reduce((sum, line) => sum.plus(line.employeeAmount), new Decimal(0))
  )
  const taxableGross = money(
    lines
      .filter((line) => line.kind === 'EARNING' && line.taxable)
      .reduce((sum, line) => sum.plus(line.employeeAmount), new Decimal(0))
  )
  const contributionBase = money(
    lines
      .filter((line) => line.kind === 'EARNING' && line.contributionApplicable)
      .reduce((sum, line) => sum.plus(line.employeeAmount), new Decimal(0))
  )

  let employeeContributions = new Decimal(0)
  let employerContributions = new Decimal(0)
  for (const rawRule of input.contributionRules) {
    const rule = contributionRuleSchema.parse(rawRule)
    const employeeAmount = calculateContribution(contributionBase, rule.employeeRate, rule.ceiling)
    const employerAmount = calculateContribution(contributionBase, rule.employerRate, rule.ceiling)
    employeeContributions = employeeContributions.plus(employeeAmount)
    employerContributions = employerContributions.plus(employerAmount)
    lines.push({
      code: rule.code,
      name: rule.name,
      kind: 'EMPLOYER_CONTRIBUTION',
      amount: employeeAmount.plus(employerAmount),
      employeeAmount,
      employerAmount,
      taxable: false,
      contributionApplicable: false,
      order: rule.calculationOrder,
      source: 'VERIFIED_STATUTORY_RULE',
      explanation: { employeeRate: rule.employeeRate, employerRate: rule.employerRate, ceiling: rule.ceiling || null }
    })
  }
  employeeContributions = money(employeeContributions)
  employerContributions = money(employerContributions)

  let professionalExpenses = taxableGross.mul(input.professionalExpenseRate || 0)
  if (input.professionalExpenseCeiling !== null && input.professionalExpenseCeiling !== undefined) {
    professionalExpenses = Decimal.min(professionalExpenses, input.professionalExpenseCeiling)
  }
  professionalExpenses = money(Decimal.max(0, professionalExpenses))
  const taxableNet = money(Decimal.max(0, taxableGross.minus(employeeContributions).minus(professionalExpenses)))
  const incomeTax = calculateProgressiveTax(taxableNet, input.incomeTaxBrackets)
  const manualDeductions = money(
    lines
      .filter((line) => line.kind === 'DEDUCTION')
      .reduce((sum, line) => sum.plus(line.employeeAmount), new Decimal(0))
  )
  const reimbursements = money(
    lines
      .filter((line) => line.kind === 'REIMBURSEMENT')
      .reduce((sum, line) => sum.plus(line.employeeAmount), new Decimal(0))
  )
  const totalDeductions = money(manualDeductions.plus(employeeContributions).plus(incomeTax))
  const netPayable = money(Decimal.max(0, grossSalary.plus(reimbursements).minus(totalDeductions)))
  const employerCost = money(grossSalary.plus(employerContributions))
  const orderedLines = lines.sort((a, b) => a.order - b.order || a.code.localeCompare(b.code))
  const hashPayload = JSON.stringify({
    input: { ...input, baseSalary: baseSalary.toFixed(2), recurringLines: undefined, variableLines: undefined },
    lines: orderedLines.map((line) => ({
      ...line,
      amount: line.amount.toFixed(2),
      employeeAmount: line.employeeAmount.toFixed(2),
      employerAmount: line.employerAmount.toFixed(2)
    })),
    totals: {
      grossSalary: grossSalary.toFixed(2),
      taxableNet: taxableNet.toFixed(2),
      netPayable: netPayable.toFixed(2),
      employerCost: employerCost.toFixed(2)
    }
  })

  return {
    lines: orderedLines,
    grossSalary,
    taxableGross,
    contributionBase,
    employeeContributions,
    employerContributions,
    taxableNet,
    incomeTax,
    totalDeductions,
    netPayable,
    employerCost,
    calculationHash: createHash('sha256').update(hashPayload).digest('hex')
  }
}
