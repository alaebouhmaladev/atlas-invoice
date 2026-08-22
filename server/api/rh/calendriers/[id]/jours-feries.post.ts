import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { addHoliday } from '~/server/services/hrLeaveConfiguration.service'

const schema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  isPaid: z.boolean().optional(),
  isWorkingDay: z.boolean().optional()
})

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.holiday.manage')
  const calendarId = getRouterParam(event, 'id')
  if (!calendarId) throw new Error('Identifiant manquant.')
  return addHoliday(calendarId, schema.parse(await readBody(event)), actor)
})
