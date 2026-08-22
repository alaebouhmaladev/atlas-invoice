import { defineEventHandler, getRouterParam } from 'h3'
import { hasHrPermission, requireHrPermission } from '~/server/utils/hrPermissions'
import { getAuthorizedPayrollRecord } from '~/server/services/hrPayslip.service'
export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(
    event,
    hasHrPermission(event.context.user, 'hr.payroll.read') ? 'hr.payroll.read' : 'hr.payroll.read_own'
  )
  return getAuthorizedPayrollRecord(
    String(getRouterParam(event, 'recordId')),
    actor,
    !hasHrPermission(actor, 'hr.payroll.read')
  )
})
