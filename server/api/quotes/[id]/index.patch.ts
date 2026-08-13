import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { quoteUpdateSchema } from '../../../utils/validation'
import { updateQuote } from '../../../services/quote.service'
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

  const body = await readBody(event)
  const parseResult = quoteUpdateSchema.safeParse(body)
  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Données de mise à jour du devis invalides',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  try {
    const quote = await updateQuote(id, parseResult.data, user.id)
    return createSuccessResponse({ quote })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'UPDATE_QUOTE_FAILED',
        message: error.message || 'Échec de la mise à jour du devis'
      }
    })
  }
})
