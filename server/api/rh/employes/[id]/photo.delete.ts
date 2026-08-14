import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { removeEmployeePhoto } from '../../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.update')
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID d’employé manquant' })
  }

  const updated = await removeEmployeePhoto(id, user)

  return {
    success: true,
    data: updated
  }
})
