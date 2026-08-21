import { defineEventHandler, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { createShiftTemplate } from '../../../services/hrShiftTemplate.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.template.manage')
  const body = await readBody(event)

  try {
    const template = await createShiftTemplate(body, user)
    return { success: true, data: template }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de la création du modèle de shift.',
      data: { code: err.data?.code || 'TEMPLATE_CREATE_FAILED', message: err.message }
    })
  }
})
