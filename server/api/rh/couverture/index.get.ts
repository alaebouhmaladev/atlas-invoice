import { defineEventHandler, getQuery, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { getStaffingRequirements } from '../../../services/hrCoverage.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.schedule.read')
  const query = getQuery(event)
  const siteId = query.siteId as string

  if (!siteId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'MISSING_PARAM', message: 'Le paramètre siteId est obligatoire.' }
    })
  }

  const reqs = await getStaffingRequirements(siteId, user)
  return { success: true, data: reqs }
})
