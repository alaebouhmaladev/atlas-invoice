import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { revokeSingleSession } from '~/server/services/userManagement.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'MISSING_SESSION_ID', message: 'L\'identifiant de la session est requis' }
    })
  }

  const result = await revokeSingleSession(id, user.id)
  return {
    success: true,
    data: result
  }
})
