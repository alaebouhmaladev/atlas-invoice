import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { duplicateQuote } from '../../../services/quote.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant de devis requis' }
    })
  }

  try {
    const quote = await duplicateQuote(id, user.id)
    event.node.res.statusCode = 201
    return createSuccessResponse({ quote })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'DUPLICATE_QUOTE_FAILED',
        message: error.message || 'Échec de la duplication du devis'
      }
    })
  }
})
