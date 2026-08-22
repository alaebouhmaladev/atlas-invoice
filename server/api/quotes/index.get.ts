import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAuth } from '../../utils/auth'
import { quoteQuerySchema } from '../../utils/validation'
import { getQuotes } from '../../services/quote.service'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const parseResult = quoteQuerySchema.safeParse(query)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Paramètres de recherche invalides',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  const result = await getQuotes(parseResult.data)
  return createSuccessResponse(result)
})
