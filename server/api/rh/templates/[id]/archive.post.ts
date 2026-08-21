import { defineEventHandler, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { archiveShiftTemplate } from '../../../../services/hrShiftTemplate.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.template.manage')
  const id = event.context.params?.id as string

  try {
    const archived = await archiveShiftTemplate(id, user)
    return { success: true, data: archived }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur d’archivage du modèle de shift.',
      data: { code: 'TEMPLATE_ARCHIVE_FAILED', message: err.message }
    })
  }
})
