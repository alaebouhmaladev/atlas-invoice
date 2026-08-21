import { defineEventHandler, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { deleteEmployeeAvailability } from '../../../services/hrAvailability.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.availability.manage')
  const id = event.context.params?.id as string

  try {
    await deleteEmployeeAvailability(id, user)
    return { success: true }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de la suppression de la déclaration.',
      data: { code: 'AVAILABILITY_DELETE_FAILED', message: err.message }
    })
  }
})
