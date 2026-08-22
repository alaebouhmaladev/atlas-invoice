import { createHash } from 'node:crypto'
import { prisma } from '../utils/db'
import { createNotification } from './notification.service'

export async function detectPayrollBlockers(tenantId: string, dryRun = false) {
  const periods = await prisma.payrollPeriod.findMany({
    where: { tenantId, status: { in: ['DRAFT', 'CALCULATED', 'VALIDATED', 'REOPENED'] } },
    include: { statutoryRuleSet: true, records: { select: { calculationHash: true } } }
  })
  const findings: Array<{ periodId: string; codes: string[] }> = []
  for (const period of periods) {
    const codes: string[] = []
    if (
      !period.statutoryRuleSet ||
      !period.statutoryRuleSet.isActive ||
      period.statutoryRuleSet.verificationStatus !== 'VERIFIED'
    )
      codes.push('UNVERIFIED_STATUTORY_RULES')
    if (!period.records.length && period.status !== 'DRAFT') codes.push('MISSING_PAYROLL_RECORDS')
    if (period.outputHash && period.records.length) {
      const digest = createHash('sha256')
        .update(JSON.stringify(period.records.map((record) => record.calculationHash).sort()))
        .digest('hex')
      if (digest !== period.outputHash) codes.push('CALCULATION_HASH_MISMATCH')
    }
    if (!codes.length) continue
    findings.push({ periodId: period.id, codes })
    if (!dryRun)
      await createNotification({
        recipientRole: 'SUPER_ADMIN',
        type: 'PAYROLL_BLOCKERS',
        severity: 'WARNING',
        title: 'Blocages de paie détectés',
        message: 'Une période de paie nécessite une intervention avant validation ou clôture.',
        actionUrl: `/rh/paie/periodes/${period.id}`,
        entityType: 'PayrollPeriod',
        entityId: period.id,
        deduplicationKey: `payroll-job:${tenantId}:${period.id}:${codes.sort().join('-')}`
      })
  }
  return {
    job: 'detectPayrollBlockers',
    dryRun,
    inspectedCount: periods.length,
    findingCount: findings.length,
    findings
  }
}

export async function remindPendingPayrollVariables(tenantId: string, dryRun = false) {
  const pendingCount = await prisma.payrollVariable.count({ where: { tenantId, status: 'SUBMITTED' } })
  if (pendingCount && !dryRun)
    await createNotification({
      recipientRole: 'HR_MANAGER',
      type: 'PAYROLL_VARIABLE_REMINDER',
      severity: 'WARNING',
      title: 'Variables de paie à examiner',
      message: `${pendingCount} variable(s) de paie attendent une décision.`,
      actionUrl: '/rh/paie/variables',
      deduplicationKey: `payroll-variable-reminder:${tenantId}:${new Date().toISOString().slice(0, 10)}`
    })
  return { job: 'remindPendingPayrollVariables', dryRun, pendingCount }
}
