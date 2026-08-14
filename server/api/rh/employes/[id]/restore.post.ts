import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { restoreEmployee } from '../../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.restore')
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ confirmText: string }>(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID d’employé manquant' })
  }

  const restored = await restoreEmployee(id, body?.confirmText, user)

  return {
    success: true,
    data: restored
  }
})
