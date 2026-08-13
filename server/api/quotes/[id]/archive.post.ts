import { defineEventHandler, createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { archiveQuote } from '../../../services/quote.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  // SUPER_ADMIN & ACCOUNTANT only
  const user = await requireRole(event, 'SUPER_ADMIN', 'ACCOUNTANT')
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant de devis requis' }
    })
  }

  try {
    const quote = await archiveQuote(id, user.id)
    return createSuccessResponse({ quote })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'ARCHIVE_QUOTE_FAILED',
        message: error.message || "Échec de l'archivage du devis"
      }
    })
  }
})
