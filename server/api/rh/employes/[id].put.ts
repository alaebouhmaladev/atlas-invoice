import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { updateEmployee, type UpdateEmployeeInput } from '../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.update')
  const id = getRouterParam(event, 'id')
  const body = await readBody<UpdateEmployeeInput>(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID d’employé manquant' })
  }

  const updated = await updateEmployee(id, body, user)

  return {
    success: true,
    data: updated
  }
})
