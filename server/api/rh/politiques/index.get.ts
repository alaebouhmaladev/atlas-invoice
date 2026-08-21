import { defineEventHandler, getQuery, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { getSiteSchedulePolicy } from '../../../services/hrPolicy.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.schedule.read')
  const query = getQuery(event)
  const siteId = query.siteId as string

  if (!siteId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'MISSING_PARAM', message: 'Le paramètre siteId est obligatoire.' }
    })
  }

  const policy = await getSiteSchedulePolicy(siteId, user)
  return { success: true, data: policy }
})
