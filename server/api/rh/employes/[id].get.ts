import { defineEventHandler, getRouterParam } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { getEmployeeById } from '../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.read')
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID d’employé manquant' })
  }

  const employee = await getEmployeeById(id, user)

  return {
    success: true,
    data: employee
  }
})
