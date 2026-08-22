import { defineEventHandler, getQuery } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getLeaveBalances } from '~/server/services/hrLeaveBalance.service'

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.balance.read')
  const employeeId = getQuery(event).employeeId
  return getLeaveBalances(actor.tenantId || 'default-tenant', employeeId ? String(employeeId) : undefined)
})
