import Decimal from 'decimal.js'
import type { UserPublic } from '../../types/auth'
import { prisma } from '../utils/db'

const tenantOf = (actor: UserPublic) => actor.tenantId || 'default-tenant'

export function escapePayrollCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value)
  const protectedValue = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${protectedValue.replace(/"/g, '""')}"`
}

export async function buildPayrollRegisterCsv(periodId: string, actor: UserPublic): Promise<string> {
  const tenantId = tenantOf(actor)
  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, tenantId },
    include: { records: { orderBy: { employeeNameSnapshot: 'asc' } } }
  })
  if (!period) throw Object.assign(new Error('Période de paie introuvable.'), { statusCode: 404 })
  const rows = [
    [
      'Matricule',
      'Employé',
      'Site',
      'Département',
      'Brut',
      'Cotisations salarié',
      'Impôt',
      'Déductions',
      'Net à payer',
      'Coût employeur'
    ],
    ...period.records.map((record) => [
      record.employeeNumberSnapshot,
      record.employeeNameSnapshot,
      record.siteSnapshot,
      record.departmentSnapshot,
      record.grossSalary.toFixed(2),
      record.employeeContributions.toFixed(2),
      record.incomeTax.toFixed(2),
      record.totalDeductions.toFixed(2),
      record.netPayable.toFixed(2),
      record.employerCost.toFixed(2)
    ])
  ]
  return `\uFEFF${rows.map((row) => row.map(escapePayrollCsvCell).join(';')).join('\r\n')}`
}

interface AccountingMapping {
  debitAccount?: string
  creditAccount?: string
  label?: string
}

export async function buildAccountingExport(periodId: string, actor: UserPublic): Promise<string> {
  const tenantId = tenantOf(actor)
  const [period, configuration] = await Promise.all([
    prisma.payrollPeriod.findFirst({ where: { id: periodId, tenantId }, include: { records: true } }),
    prisma.payrollConfiguration.findFirst({ where: { tenantId, isActive: true }, orderBy: { effectiveFrom: 'desc' } })
  ])
  if (!period) throw Object.assign(new Error('Période de paie introuvable.'), { statusCode: 404 })
  if (period.status !== 'CLOSED')
    throw Object.assign(new Error('L’export comptable exige une période clôturée.'), { statusCode: 409 })
  const mapping = (configuration?.accountingMappings || {}) as AccountingMapping
  if (!mapping.debitAccount || !mapping.creditAccount)
    throw Object.assign(new Error('Le mapping comptable débit/crédit doit être configuré.'), { statusCode: 422 })
  const total = period.records.reduce((sum, record) => sum.plus(record.employerCost), new Decimal(0)).toDecimalPlaces(2)
  const entries = [
    { account: mapping.debitAccount, side: 'DÉBIT', amount: total, label: mapping.label || `Paie ${period.name}` },
    { account: mapping.creditAccount, side: 'CRÉDIT', amount: total, label: mapping.label || `Paie ${period.name}` }
  ]
  const debits = entries
    .filter((entry) => entry.side === 'DÉBIT')
    .reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0))
  const credits = entries
    .filter((entry) => entry.side === 'CRÉDIT')
    .reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0))
  if (!debits.eq(credits))
    throw Object.assign(new Error('L’export est déséquilibré: total débit différent du total crédit.'), {
      statusCode: 422
    })
  const rows = [
    ['Compte', 'Sens', 'Libellé', 'Référence', 'Date', 'Montant'],
    ...entries.map((entry) => [
      entry.account,
      entry.side,
      entry.label,
      period.periodNumber,
      period.paymentDate.toISOString().slice(0, 10),
      entry.amount.toFixed(2)
    ])
  ]
  return `\uFEFF${rows.map((row) => row.map(escapePayrollCsvCell).join(';')).join('\r\n')}`
}

export async function buildBankExport(periodId: string, actor: UserPublic): Promise<string> {
  const tenantId = tenantOf(actor)
  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, tenantId, status: 'CLOSED' },
    include: { records: { orderBy: { employeeNameSnapshot: 'asc' } } }
  })
  if (!period) throw Object.assign(new Error('Une période clôturée est obligatoire.'), { statusCode: 404 })
  const rows = [
    ['Matricule', 'Bénéficiaire', 'RIB masqué', 'Montant', 'Devise', 'Référence'],
    ...period.records.map((record) => [
      record.employeeNumberSnapshot,
      record.employeeNameSnapshot,
      record.bankMaskedSnapshot || 'Non renseigné',
      record.netPayable.toFixed(2),
      'MAD',
      period.periodNumber
    ])
  ]
  return `\uFEFF${rows.map((row) => row.map(escapePayrollCsvCell).join(';')).join('\r\n')}`
}
