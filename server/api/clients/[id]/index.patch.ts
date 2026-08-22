import { defineEventHandler, getRouterParam, readBody, getRequestIP, getRequestHeader, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { clientUpdateSchema } from '../../../utils/validation'
import { getClientById, findDuplicates, updateClient } from '../../../services/client.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant client requis' }
    })
  }

  const existing = await getClientById(id)
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Ressource introuvable',
      data: { code: 'CLIENT_NOT_FOUND', message: 'Client introuvable' }
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const validation = clientUpdateSchema.safeParse(body)

  if (!validation.success) {
    const issue = validation.error.issues[0]
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      data: {
        code: 'VALIDATION_ERROR',
        message: issue ? issue.message : 'Champs de formulaire invalides',
        details: validation.error.issues
      }
    })
  }

  const clientData = validation.data
  const ipAddress = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const userAgent = getRequestHeader(event, 'user-agent')

  // Check duplicates excluding current client ID
  const { exactIceConflict, potentialDuplicates } = await findDuplicates(clientData, id)

  if (exactIceConflict) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflit',
      data: {
        code: 'EXACT_ICE_CONFLICT',
        message: `Un autre client avec le numéro ICE (${clientData.ice}) existe déjà.`
      }
    })
  }

  if (potentialDuplicates.length > 0 && !clientData.confirmDuplicate) {
    return createSuccessResponse({
      duplicateWarning: true,
      potentialDuplicates,
      client: null
    })
  }

  const updatedClient = await updateClient(id, clientData, user.id, ipAddress, userAgent)
  return createSuccessResponse({
    duplicateWarning: false,
    client: updatedClient
  })
})
