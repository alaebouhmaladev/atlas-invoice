import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import {
  calculateContribution,
  calculatePayroll,
  calculateProgressiveTax,
  type PayrollEngineInput,
  type PayrollEngineLine
} from '../server/services/hrPayrollEngine'
import { calculateContractSalaryBasis } from '../server/services/hrPayroll.service'

const line = (overrides: Partial<PayrollEngineLine> = {}): PayrollEngineLine => ({
  code: 'PRIME',
  name: 'Prime',
  kind: 'EARNING',
  amount: new Decimal(100),
  employeeAmount: new Decimal(100),
  employerAmount: new Decimal(0),
  taxable: true,
  contributionApplicable: true,
  order: 50,
  source: 'TEST',
  explanation: {},
  ...overrides
})
const baseInput = (overrides: Partial<PayrollEngineInput> = {}): PayrollEngineInput => ({
  baseSalary: '10000',
  scheduledMinutes: 10000,
  eligibleMinutes: 10000,
  workedMinutes: 9000,
  paidLeaveMinutes: 1000,
  unpaidLeaveMinutes: 0,
  missingMinutes: 0,
  recurringLines: [],
  variableLines: [],
  contributionRules: [],
  incomeTaxBrackets: [],
  prorationMethod: 'SCHEDULED_MINUTES',
  ...overrides
})

describe('HR Phase 6 — moteur de paie exact et déterministe', () => {
  it('calcule un salaire de base complet', () =>
    expect(calculatePayroll(baseInput()).netPayable.toFixed(2)).toBe('10000.00'))
  it('proratise une embauche en cours de période', () =>
    expect(calculatePayroll(baseInput({ eligibleMinutes: 5000 })).grossSalary.toFixed(2)).toBe('5000.00'))
  it('proratise un départ en cours de période', () =>
    expect(calculatePayroll(baseInput({ eligibleMinutes: 7500 })).grossSalary.toFixed(2)).toBe('7500.00'))
  it('segmente un changement de salaire en cours de mois', () => {
    const basis = calculateContractSalaryBasis(
      [
        {
          startDate: new Date('2026-08-01T00:00:00.000Z'),
          endDate: new Date('2026-08-15T23:59:59.999Z'),
          salarySnapshot: new Decimal(10000)
        },
        {
          startDate: new Date('2026-08-16T00:00:00.000Z'),
          endDate: null,
          salarySnapshot: new Decimal(12000)
        }
      ],
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-31T23:59:59.999Z'),
      10000
    )
    expect(basis.segments).toHaveLength(2)
    expect(basis.eligibleMinutes).toBe(10000)
    expect(basis.weightedSalary.toFixed(2)).toBe('11032.20')
  })
  it('préserve le salaire pendant un congé payé', () =>
    expect(calculatePayroll(baseInput({ workedMinutes: 8000, paidLeaveMinutes: 2000 })).netPayable.toFixed(2)).toBe(
      '10000.00'
    ))
  it('déduit un congé sans solde', () =>
    expect(calculatePayroll(baseInput({ unpaidLeaveMinutes: 1000 })).netPayable.toFixed(2)).toBe('9000.00'))
  it('déduit une absence injustifiée', () =>
    expect(calculatePayroll(baseInput({ missingMinutes: 500 })).netPayable.toFixed(2)).toBe('9500.00'))
  it('ajoute une prime fixe imposable', () =>
    expect(calculatePayroll(baseInput({ recurringLines: [line()] })).grossSalary.toFixed(2)).toBe('10100.00'))
  it('ajoute une variable approuvée fournie au moteur', () =>
    expect(
      calculatePayroll(
        baseInput({ variableLines: [line({ employeeAmount: new Decimal(250), amount: new Decimal(250) })] })
      ).netPayable.toFixed(2)
    ).toBe('10250.00'))
  it('applique une retenue salarié', () =>
    expect(
      calculatePayroll(
        baseInput({
          variableLines: [
            line({
              kind: 'DEDUCTION',
              employeeAmount: new Decimal(300),
              amount: new Decimal(300),
              taxable: false,
              contributionApplicable: false
            })
          ]
        })
      ).netPayable.toFixed(2)
    ).toBe('9700.00'))
  it('respecte un plafond de cotisation configurable', () =>
    expect(calculateContribution('10000', '0.05', '6000').toFixed(2)).toBe('300.00'))
  it('calcule séparément les contributions employeur', () => {
    const result = calculatePayroll(
      baseInput({
        contributionRules: [
          {
            code: 'SOC',
            name: 'Cotisation configurée',
            employeeRate: '0.04',
            employerRate: '0.08',
            ceiling: null,
            calculationOrder: 200
          }
        ]
      })
    )
    expect(result.employeeContributions.toFixed(2)).toBe('400.00')
    expect(result.employerContributions.toFixed(2)).toBe('800.00')
    expect(result.employerCost.toFixed(2)).toBe('10800.00')
  })
  it('calcule des tranches fiscales progressives', () =>
    expect(
      calculateProgressiveTax('12000', [
        { from: '0', to: '5000', rate: '0' },
        { from: '5000', to: '10000', rate: '0.10' },
        { from: '10000', to: null, rate: '0.20' }
      ]).toFixed(2)
    ).toBe('900.00'))
  it('applique les frais professionnels configurables avant IR', () => {
    const result = calculatePayroll(
      baseInput({
        professionalExpenseRate: '0.10',
        professionalExpenseCeiling: '800',
        incomeTaxBrackets: [{ from: '0', to: null, rate: '0.10' }]
      })
    )
    expect(result.taxableNet.toFixed(2)).toBe('9200.00')
    expect(result.incomeTax.toFixed(2)).toBe('920.00')
  })
  it('arrondit les montants MAD au centime en HALF_UP', () =>
    expect(calculateContribution('10.05', '0.1').toFixed(2)).toBe('1.01'))
  it('réconcilie exactement le net à payer', () => {
    const result = calculatePayroll(
      baseInput({
        contributionRules: [{ code: 'SOC', name: 'Social', employeeRate: '0.04', employerRate: '0.08', ceiling: null }],
        incomeTaxBrackets: [{ from: '0', to: null, rate: '0.10' }]
      })
    )
    expect(result.netPayable.eq(result.grossSalary.minus(result.totalDeductions))).toBe(true)
  })
  it('réconcilie exactement le coût employeur', () => {
    const result = calculatePayroll(
      baseInput({
        contributionRules: [{ code: 'SOC', name: 'Social', employeeRate: '0', employerRate: '0.08', ceiling: null }]
      })
    )
    expect(result.employerCost.eq(result.grossSalary.plus(result.employerContributions))).toBe(true)
  })
  it('produit la même empreinte pour les mêmes entrées', () =>
    expect(calculatePayroll(baseInput()).calculationHash).toBe(calculatePayroll(baseInput()).calculationHash))
  it('rejette une durée planifiée nulle', () =>
    expect(() => calculatePayroll(baseInput({ scheduledMinutes: 0 }))).toThrow(/strictement positives/))
})
