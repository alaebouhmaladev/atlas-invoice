import type { LeaveDayPortion } from '@prisma/client'
import { prisma } from '../utils/db'
import { enumerateHrDates, getHrDateRange, parseHrLocalDate } from '../utils/hrDates'
import { findHolidayForSiteDate } from './hrLeaveConfiguration.service'
import { calculatePortionMinutes } from './hrLeaveRequest.service'
import { hasHrPermission } from '../utils/hrPermissions'
import type { UserPublic } from '~/types/auth'
import { calculateStaffingCoverage } from './hrSchedule.service'

export async function previewLeaveDuration(tenantId: string, input: { employeeId: string; leaveTypeId: string; startDate: string; endDate: string; startPortion?: LeaveDayPortion; endPortion?: LeaveDayPortion; customStartMinute?: number | null; customEndMinute?: number | null }, actor: UserPublic) {
  const startDate = parseHrLocalDate(input.startDate)
  const endDate = parseHrLocalDate(input.endDate)
  if (endDate < startDate) throw new Error('La date de fin doit suivre la date de début.')
  const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, tenantId, archivedAt: null }, select: { linkedUserId: true } })
  if (!employee) throw new Error('Collaborateur introuvable.')
  if (!hasHrPermission(actor, 'hr.leave.create_for_employee') && employee.linkedUserId !== actor.id) {
    const error: any = new Error('Vous ne pouvez calculer que vos propres absences.')
    error.statusCode = 403
    throw error
  }
  const assignment = await prisma.employeeAssignment.findFirst({ where: { tenantId, employeeId: input.employeeId, startDate: { lte: startDate }, OR: [{ endDate: null }, { endDate: { gte: endDate } }] }, orderBy: { isPrimary: 'desc' } })
  if (!assignment) throw new Error('Aucune affectation valide ne couvre cette période.')
  const policy = await prisma.leavePolicy.findFirst({ where: { tenantId, leaveTypeId: input.leaveTypeId, isActive: true, effectiveFrom: { lte: startDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: endDate } }], AND: [{ OR: [{ siteId: assignment.siteId }, { siteId: null }] }] }, orderBy: [{ priority: 'desc' }, { siteId: 'desc' }] })
  if (!policy) throw new Error('Aucune politique active ne couvre cette période.')
  const breakdown = []
  for (const [index, dateString] of enumerateHrDates(startDate, endDate).entries()) {
    const localDate = parseHrLocalDate(dateString)
    const range = getHrDateRange(localDate)
    const shift = await prisma.scheduledShift.findFirst({ where: { tenantId, employeeId: input.employeeId, workDate: { gte: range.start, lte: range.end }, status: { in: ['PLANNED', 'PUBLISHED', 'CHANGED'] } } })
    const holiday = policy.excludeHolidays ? await findHolidayForSiteDate(tenantId, assignment.siteId, localDate) : null
    const plannedMinutes = shift?.totalWorkMinutes || (policy.workingWeekdays.includes(localDate.getUTCDay()) ? policy.minutesPerDay : 0)
    const isWorkingDay = plannedMinutes > 0 && (!holiday || holiday.isWorkingDay)
    let portion: LeaveDayPortion = 'FULL_DAY'
    if (index === 0) portion = input.startPortion || 'FULL_DAY'
    if (dateString === input.endDate) portion = input.endPortion || portion
    const chargeableMinutes = isWorkingDay ? calculatePortionMinutes(plannedMinutes, portion, input.customStartMinute, input.customEndMinute) : 0
    breakdown.push({ localDate: dateString, scheduledMinutes: plannedMinutes, chargeableMinutes, portion, excludedReason: isWorkingDay ? null : holiday ? 'PUBLIC_HOLIDAY' : 'NON_WORKING_DAY', holidayName: holiday?.name || null, scheduledShiftId: shift?.id || null, publishedShift: shift?.status === 'PUBLISHED' })
  }
  const requestedMinutes = breakdown.reduce((sum, day) => sum + day.chargeableMinutes, 0)
  const staffingImpact = []
  for (const day of breakdown.filter(item => item.scheduledShiftId && item.chargeableMinutes > 0)) {
    const coverage = await calculateStaffingCoverage(assignment.siteId, day.localDate, actor)
    for (const item of coverage.filter(item => item.positionId === assignment.positionId)) {
      const projectedCount = Math.max(0, item.actualCount - 1)
      if (projectedCount < item.minRequired) staffingImpact.push({ ...item, projectedCount })
    }
  }
  return { requestedMinutes, equivalentDays: policy.minutesPerDay ? requestedMinutes / policy.minutesPerDay : 0, breakdown, planningConflicts: breakdown.filter(day => day.scheduledShiftId), staffingWarning: staffingImpact.length > 0, staffingImpact, policy: { id: policy.id, name: policy.name, approvalWorkflow: policy.approvalWorkflow, blockOnCoverageWarning: policy.blockOnCoverageWarning } }
}
