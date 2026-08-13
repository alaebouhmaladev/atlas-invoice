import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { quoteStatusSchema } from '../../../utils/validation'
import { changeQuoteStatus } from '../../../services/quote.service'
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
  const parseResult = quoteStatusSchema.safeParse(body)
  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Statut de devis invalide',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  try {
    const quote = await changeQuoteStatus(id, parseResult.data.status, user.id)
    return createSuccessResponse({ quote })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      data: {
        code: 'STATUS_CHANGE_FAILED',
        message: error.message || 'Transition de statut non autorisée'
      }
    })
  }
})
