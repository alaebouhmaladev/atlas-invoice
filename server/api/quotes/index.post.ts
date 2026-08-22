import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../utils/auth'
import { quoteSchema } from '../../utils/validation'
import { createQuote } from '../../services/quote.service'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parseResult = quoteSchema.safeParse(body)
  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Données du devis invalides',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  try {
    const quote = await createQuote(parseResult.data, user.id)
    event.node.res.statusCode = 201
    return createSuccessResponse({ quote })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'CREATE_QUOTE_FAILED',
        message: error.message || 'Échec de la création du devis'
      }
    })
  }
})
