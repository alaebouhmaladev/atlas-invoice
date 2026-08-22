import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createHolidayCalendar } from '~/server/services/hrLeaveConfiguration.service'

const schema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(120),
  isDefault: z.boolean().optional(),
  siteIds: z.array(z.string().uuid()).optional()
})

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.holiday.manage')
  return createHolidayCalendar(schema.parse(await readBody(event)), actor)
})
