import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAuth } from '../../utils/auth'
import { clientQuerySchema } from '../../utils/validation'
import { getClients } from '../../services/client.service'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const rawQuery = getQuery(event)
  const queryResult = clientQuerySchema.safeParse(rawQuery)

  if (!queryResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'VALIDATION_ERROR',
        message: queryResult.error.issues[0]?.message || 'Paramètres de requête invalides'
      }
    })
  }

  const result = await getClients(queryResult.data)
  return createSuccessResponse(result)
})
