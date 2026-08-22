import { defineEventHandler } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { listLeaveTypes } from '~/server/services/hrLeaveConfiguration.service'

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.read')
  return listLeaveTypes(actor.tenantId || 'default-tenant')
})
