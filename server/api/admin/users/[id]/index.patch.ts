import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requireSuperAdmin } from '~/server/utils/auth'
import { updateUser } from '~/server/services/userManagement.service'

export default defineEventHandler(async (event) => {
  const actor = await requireSuperAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'MISSING_USER_ID', message: 'L\'identifiant de l\'utilisateur est requis' }
    })
  }

  const body = await readBody(event)
  const updated = await updateUser(id, body, actor.id)
  return {
    success: true,
    data: updated
  }
})
