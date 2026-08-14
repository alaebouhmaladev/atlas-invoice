import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireSuperAdmin } from '~/server/utils/auth'
import { deactivateUser } from '~/server/services/userManagement.service'

export default defineEventHandler(async (event) => {
  const actor = await requireSuperAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'MISSING_USER_ID', message: 'L\'identifiant de l\'utilisateur est requis' }
    })
  }

  const updated = await deactivateUser(id, actor.id)
  return {
    success: true,
    data: updated
  }
})
