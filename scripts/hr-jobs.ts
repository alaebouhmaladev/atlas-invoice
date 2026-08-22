import {
  detectMissingClockOuts,
  detectMissingClockIns,
  monitorOpenSessions,
  detectAbsences,
  recalculateDailyAttendance,
  sendPendingValidationReminders
} from '../server/services/hrAttendanceJobs.service'
import { accrueConfiguredLeaveBalances, carryForwardLeaveBalances, expireCarriedLeaveBalances, initializeYearlyLeaveBalances, sendLeaveApprovalReminders } from '../server/services/hrLeaveJobs.service'
import { detectPayrollBlockers, remindPendingPayrollVariables } from '../server/services/hrPayrollJobs.service'

async function main() {
  const args = process.argv.slice(2)
  const jobName = args[0] || 'all'
  const tenantId = args[1] || 'default-tenant'

  console.log(`[HR JOBS] Executing job "${jobName}" for tenant "${tenantId}"...`)

  if (jobName === 'missing-clock-outs' || jobName === 'all') {
    const res = await detectMissingClockOuts(tenantId)
    console.log('[HR JOBS] missing-clock-outs result:', res)
  }

  if (jobName === 'missing-clock-ins' || jobName === 'all') {
    const res = await detectMissingClockIns(tenantId)
    console.log('[HR JOBS] missing-clock-ins result:', res)
  }

  if (jobName === 'open-sessions' || jobName === 'all') {
    const res = await monitorOpenSessions(tenantId)
    console.log('[HR JOBS] open-sessions result:', res)
  }

  if (jobName === 'absences' || jobName === 'all') {
    const res = await detectAbsences(tenantId)
    console.log('[HR JOBS] absences result:', res)
  }

  if (jobName === 'recalculate' || jobName === 'all') {
    const res = await recalculateDailyAttendance(tenantId)
    console.log('[HR JOBS] recalculate result:', res)
  }

  if (jobName === 'reminders' || jobName === 'all') {
    const res = await sendPendingValidationReminders(tenantId)
    console.log('[HR JOBS] reminders result:', res)
  }

  if (jobName === 'leave-accrual' || jobName === 'all') {
    const frequency = args[2] || 'MONTHLY'
    const res = await accrueConfiguredLeaveBalances(tenantId, new Date(), frequency)
    console.log('[HR JOBS] leave-accrual result:', res)
  }

  if (jobName === 'leave-reminders' || jobName === 'all') {
    const res = await sendLeaveApprovalReminders(tenantId)
    console.log('[HR JOBS] leave-reminders result:', res)
  }

  if (jobName === 'leave-initialize-year' || jobName === 'all') {
    console.log('[HR JOBS] leave-initialize-year result:', await initializeYearlyLeaveBalances(tenantId))
  }
  if (jobName === 'leave-carry-over' || jobName === 'all') {
    console.log('[HR JOBS] leave-carry-over result:', await carryForwardLeaveBalances(tenantId))
  }
  if (jobName === 'leave-expire-carry-over' || jobName === 'all') {
    console.log('[HR JOBS] leave-expire-carry-over result:', await expireCarriedLeaveBalances(tenantId))
  }

  if (jobName === 'payroll-blockers' || jobName === 'all') {
    console.log('[HR JOBS] payroll-blockers result:', await detectPayrollBlockers(tenantId, args.includes('--dry-run')))
  }
  if (jobName === 'payroll-variable-reminders' || jobName === 'all') {
    console.log('[HR JOBS] payroll-variable-reminders result:', await remindPendingPayrollVariables(tenantId, args.includes('--dry-run')))
  }

  console.log('[HR JOBS] All requested jobs executed successfully!')
}

main().catch(err => {
  console.error('[HR JOBS] Error running job:', err)
  process.exit(1)
})
