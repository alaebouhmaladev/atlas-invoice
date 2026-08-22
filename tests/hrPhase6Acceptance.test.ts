import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { escapePayrollCsvCell } from '../server/services/hrPayrollExport.service'
import { generatePayslipPdf } from '../server/services/hrPayslip.service'
import { hasHrPermission } from '../server/utils/hrPermissions'
import type { UserPublic } from '../types/auth'

const prisma = new PrismaClient()
const root = process.cwd()
const tenantId = `phase6-acceptance-${Date.now()}`
let periodId = ''
let recordId = ''
const actor = (role: UserPublic['role'], id = 'phase6-actor'): UserPublic => ({
  id,
  name: role,
  email: `${role.toLowerCase()}@example.test`,
  role,
  tenantId,
  isActive: true,
  createdAt: new Date()
})

describe('HR Phase 6 — migration, sécurité, PDF et interface', () => {
  beforeAll(async () => {
    const period = await prisma.payrollPeriod.create({
      data: {
        tenantId,
        periodNumber: `P6-${Date.now()}`,
        name: 'Paie de test',
        year: 2098,
        month: 7,
        periodStart: new Date('2098-07-01T00:00:00Z'),
        periodEnd: new Date('2098-07-31T23:59:59Z'),
        paymentDate: new Date('2098-07-31T00:00:00Z'),
        status: 'VALIDATED',
        createdById: 'phase6-test'
      }
    })
    periodId = period.id
    const record = await prisma.payrollRecord.create({
      data: {
        tenantId,
        periodId,
        employeeId: 'employee-phase6-test',
        employeeNumberSnapshot: 'EMP-P6',
        employeeNameSnapshot: 'Nom Très Long de Test Payroll',
        siteSnapshot: 'Siège',
        departmentSnapshot: 'Qualité',
        positionSnapshot: 'Ingénieur',
        contractSnapshot: { type: 'CDI' },
        bankSnapshotEncrypted: 'secret-rib-that-must-not-appear',
        bankMaskedSnapshot: '•••• •••• •••• 1234',
        baseSalarySnapshot: 10000,
        workedTimeSnapshot: { validated: true },
        leaveSnapshot: {},
        sourceSnapshot: {},
        prorationMethod: 'SCHEDULED_MINUTES',
        grossSalary: 10000,
        taxableGross: 10000,
        contributionBase: 10000,
        employeeContributions: 400,
        employerContributions: 800,
        taxableNet: 9600,
        incomeTax: 500,
        totalDeductions: 900,
        netPayable: 9100,
        employerCost: 10800,
        status: 'VALIDATED',
        calculationHash: 'abcdef1234567890abcdef1234567890',
        calculatedAt: new Date()
      }
    })
    recordId = record.id
    await prisma.payrollLine.create({
      data: {
        tenantId,
        recordId,
        componentCodeSnapshot: 'SALAIRE_BASE',
        componentNameSnapshot: 'Salaire de base',
        kind: 'EARNING',
        employeeAmount: 10000,
        employerAmount: 0,
        taxable: true,
        cnssApplicable: true,
        amoApplicable: true,
        source: 'TEST',
        calculationOrder: 10,
        calculationExplanation: {}
      }
    })
  })
  afterAll(async () => {
    await prisma.payrollLine.deleteMany({ where: { tenantId } })
    await prisma.payrollRecord.deleteMany({ where: { tenantId } })
    await prisma.payrollPeriod.deleteMany({ where: { tenantId } })
    await prisma.$disconnect()
  })

  it('déploie toutes les tables Phase 6', async () => {
    const counts = await Promise.all([
      prisma.payrollPeriod.count(),
      prisma.payrollConfiguration.count(),
      prisma.statutoryPayrollRuleSet.count(),
      prisma.salaryComponentDefinition.count(),
      prisma.employeeSalaryComponent.count(),
      prisma.payrollVariable.count(),
      prisma.employeeAdvance.count(),
      prisma.employeeLoan.count(),
      prisma.payrollRecord.count(),
      prisma.payrollLine.count(),
      prisma.payrollCalculationRun.count(),
      prisma.payrollHistory.count(),
      prisma.payslipAsset.count()
    ])
    expect(counts).toHaveLength(13)
  })
  it('contient une seule migration additive Phase 6', () => {
    const sql = fs.readFileSync(
      path.join(root, 'prisma/migrations/20260822000002_add_hr_phase6_payroll/migration.sql'),
      'utf8'
    )
    expect(sql).not.toMatch(/\b(?:DROP TABLE|TRUNCATE|DELETE FROM)\b/i)
    expect(sql).toContain('CREATE TABLE "PayrollPeriod"')
  })
  it('utilise des verrous transactionnels incluant tenant et période', () => {
    const service = fs.readFileSync(path.join(root, 'server/services/hrPayroll.service.ts'), 'utf8')
    expect(service).toContain('pg_advisory_xact_lock')
    expect(service).toContain('${tenantId}:${periodId}:payroll')
  })
  it('interdit les formules CSV =', () => expect(escapePayrollCsvCell('=2+2')).toBe('"\'=2+2"'))
  it('interdit les formules CSV +, -, @, tabulation et retour chariot', () => {
    for (const value of ['+1', '-1', '@SUM(A1)', '\tcmd', '\rcmd']) expect(escapePayrollCsvCell(value)).toMatch(/^"'/)
  })
  it('accorde toutes les permissions paie au Super Admin', () =>
    expect(hasHrPermission(actor('SUPER_ADMIN'), 'hr.payroll.reopen')).toBe(true))
  it('interdit clôture et réouverture au Responsable RH', () => {
    const user = actor('HR_MANAGER')
    expect(hasHrPermission(user, 'hr.payroll.close')).toBe(false)
    expect(hasHrPermission(user, 'hr.payroll.reopen')).toBe(false)
  })
  it('limite le Commercial à ses propres bulletins', () => {
    const user = actor('COMMERCIAL')
    expect(hasHrPermission(user, 'hr.payroll.read')).toBe(false)
    expect(hasHrPermission(user, 'hr.payroll.payslip.read_own')).toBe(true)
  })
  it('génère un PDF structurellement valide', async () => {
    const result = await generatePayslipPdf(recordId, actor('SUPER_ADMIN'))
    expect(result.buffer.subarray(0, 5).toString()).toBe('%PDF-')
    expect(result.buffer.toString('latin1')).toContain('%%EOF')
  })
  it('ne révèle pas le RIB complet dans le PDF', async () => {
    const result = await generatePayslipPdf(recordId, actor('SUPER_ADMIN'))
    expect(result.buffer.toString('latin1')).not.toContain('secret-rib-that-must-not-appear')
  })
  it('protège le téléchargement par cache privé et nosniff', () => {
    const endpoint = fs.readFileSync(path.join(root, 'server/api/rh/paie/employes/[recordId]/payslip.get.ts'), 'utf8')
    expect(endpoint).toContain('private, no-store')
    expect(endpoint).toContain('nosniff')
    expect(endpoint).toContain('requireHrPermission')
  })
  it('n’embarque aucun taux marocain statutaire', () => {
    const engine = fs.readFileSync(path.join(root, 'server/services/hrPayrollEngine.ts'), 'utf8')
    expect(engine).not.toMatch(/CNSS.*(?:0\.|%)/i)
    expect(engine).toContain('contributionRules')
  })
  it('affiche une alerte sans règle vérifiée', () =>
    expect(fs.readFileSync(path.join(root, 'pages/rh/paie/parametres.vue'), 'utf8')).toContain('Clôture bloquée'))
  it('utilise uniquement des tokens sémantiques dans les pages paie', () => {
    const pages = fs
      .readdirSync(path.join(root, 'pages/rh/paie'), { recursive: true })
      .filter((file) => String(file).endsWith('.vue'))
      .map((file) => fs.readFileSync(path.join(root, 'pages/rh/paie', String(file)), 'utf8'))
      .join('\n')
    expect(pages).not.toMatch(/(?:slate|amber)-\d{2,3}/)
    expect(pages).toContain('text-main')
  })
  it('garantit une entrée Paie et un matching de navigation unique', () => {
    const sidebar = fs.readFileSync(path.join(root, 'components/layout/AppSidebar.vue'), 'utf8')
    expect(sidebar).toContain("to: '/rh/paie'")
    expect(sidebar).toContain('getActiveSidebarTarget')
  })
  it('exige les trois confirmations typées', () => {
    const service = fs.readFileSync(path.join(root, 'server/services/hrPayroll.service.ts'), 'utf8')
    expect(service).toContain('VALIDER LA PAIE')
    expect(service).toContain('CLÔTURER LA PAIE')
    expect(service).toContain('RÉOUVRIR LA PAIE')
  })
})
