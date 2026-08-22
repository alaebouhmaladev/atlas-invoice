import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { getQuoteById } from '../../../services/quote.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant de devis requis' }
    })
  }

  const quote = await getQuoteById(id)
  if (!quote) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Ressource introuvable',
      data: { code: 'QUOTE_NOT_FOUND', message: 'Devis introuvable' }
    })
  }

  return createSuccessResponse({ quote })
})
