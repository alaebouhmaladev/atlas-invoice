import { defineEventHandler } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { listHolidayCalendars } from '~/server/services/hrLeaveConfiguration.service'

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.holiday.read')
  return listHolidayCalendars(actor.tenantId || 'default-tenant')
})
