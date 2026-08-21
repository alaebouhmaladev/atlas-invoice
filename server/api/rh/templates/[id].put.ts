import { defineEventHandler, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { updateShiftTemplate } from '../../../services/hrShiftTemplate.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.template.manage')
  const id = event.context.params?.id as string
  const body = await readBody(event)

  try {
    const updated = await updateShiftTemplate(id, body, user)
    return { success: true, data: updated }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur de modification du modèle de shift.',
      data: { code: 'TEMPLATE_UPDATE_FAILED', message: err.message }
    })
  }
})
