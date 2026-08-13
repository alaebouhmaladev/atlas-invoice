import { defineEventHandler, getRouterParam, getRequestIP, getRequestHeader, createError } from 'h3'
import { requireSuperAdmin } from '../../../utils/auth'
import { getClientById, deleteClient } from '../../../services/client.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireSuperAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant client requis' }
    })
  }

  const existing = await getClientById(id)
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      data: { code: 'CLIENT_NOT_FOUND', message: 'Client introuvable' }
    })
  }

  const ipAddress = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const userAgent = getRequestHeader(event, 'user-agent')

  await deleteClient(id, user.id, ipAddress, userAgent)

  return createSuccessResponse({ message: 'Client supprimé définitivement' })
})
