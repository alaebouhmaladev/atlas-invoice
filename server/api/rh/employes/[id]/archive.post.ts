import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { archiveEmployee } from '../../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.archive')
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ reason: string; confirmText: string }>(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID d’employé manquant' })
  }

  const archived = await archiveEmployee(id, body?.reason, body?.confirmText, user)

  return {
    success: true,
    data: archived
  }
})
