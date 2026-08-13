import { defineEventHandler, readBody, getRequestIP, getRequestHeader, createError, setResponseStatus } from 'h3'
import { requireAuth } from '../../utils/auth'
import { clientSchema } from '../../utils/validation'
import { findDuplicates, createClient } from '../../services/client.service'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event).catch(() => ({}))
  const validation = clientSchema.safeParse(body)

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

  // Check for potential duplicates
  const { exactIceConflict, potentialDuplicates } = await findDuplicates(clientData)

  if (exactIceConflict) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      data: {
        code: 'EXACT_ICE_CONFLICT',
        message: `Un client avec le numéro ICE (${clientData.ice}) existe déjà.`
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

  const newClient = await createClient(clientData, user.id, ipAddress, userAgent)
  setResponseStatus(event, 201)
  return createSuccessResponse({
    duplicateWarning: false,
    client: newClient
  })
})
