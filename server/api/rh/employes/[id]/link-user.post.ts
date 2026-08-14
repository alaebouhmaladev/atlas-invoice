import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { linkUserAccount, unlinkUserAccount } from '../../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.link_user')
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ userId?: string | null; action?: 'LINK' | 'UNLINK' }>(event)

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID d’employé manquant' })
  }

  if (body?.action === 'UNLINK' || !body?.userId) {
    const updated = await unlinkUserAccount(id, user)
    return { success: true, data: updated }
  }

  const updated = await linkUserAccount(id, body.userId, user)
  return { success: true, data: updated }
})
