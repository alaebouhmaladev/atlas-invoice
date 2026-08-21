import { defineEventHandler, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { createEmployeeAvailability } from '../../../services/hrAvailability.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.availability.manage')
  const body = await readBody(event)

  try {
    const item = await createEmployeeAvailability(body, user)
    return { success: true, data: item }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de la déclaration d’indisponibilité.',
      data: { code: 'AVAILABILITY_CREATE_FAILED', message: err.message }
    })
  }
})
