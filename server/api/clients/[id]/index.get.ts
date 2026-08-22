import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { getClientById } from '../../../services/client.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant client requis' }
    })
  }

  const client = await getClientById(id)
  if (!client) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Ressource introuvable',
      data: { code: 'CLIENT_NOT_FOUND', message: 'Client introuvable' }
    })
  }

  return createSuccessResponse({ client })
})
