import { defineEventHandler, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { upsertSiteSchedulePolicy } from '../../../services/hrPolicy.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.organization.manage_sites')
  const body = await readBody(event)

  try {
    const policy = await upsertSiteSchedulePolicy(body, user)
    return { success: true, data: policy }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur de mise à jour de la politique.',
      data: { code: 'POLICY_UPDATE_FAILED', message: err.message }
    })
  }
})
