import { defineEventHandler, getQuery, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { getEmployeeAvailabilities } from '../../../services/hrAvailability.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.schedule.read')
  const query = getQuery(event)
  const employeeId = query.employeeId as string

  if (!employeeId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'MISSING_PARAM', message: 'Le paramètre employeeId est obligatoire.' }
    })
  }

  const items = await getEmployeeAvailabilities(employeeId, user)
  return { success: true, data: items }
})
