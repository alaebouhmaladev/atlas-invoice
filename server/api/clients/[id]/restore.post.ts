import { defineEventHandler, getRouterParam, getRequestIP, getRequestHeader, createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { getClientById, restoreClient } from '../../../services/client.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'SUPER_ADMIN', 'ACCOUNTANT')

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

  if (!existing.isArchived) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'NOT_ARCHIVED', message: "Ce client n'est pas archivé" }
    })
  }

  const ipAddress = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const userAgent = getRequestHeader(event, 'user-agent')

  const restoredClient = await restoreClient(id, user.id, ipAddress, userAgent)
  return createSuccessResponse({ client: restoredClient })
})
