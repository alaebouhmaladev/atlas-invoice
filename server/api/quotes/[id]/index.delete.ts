import { defineEventHandler, createError } from 'h3'
import { requireSuperAdmin } from '../../../utils/auth'
import { deleteQuote } from '../../../services/quote.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireSuperAdmin(event) // SUPER_ADMIN only
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant de devis requis' }
    })
  }

  try {
    await deleteQuote(id, user.id)
    return createSuccessResponse({ message: 'Devis supprimé définitivement' })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      data: {
        code: 'DELETE_QUOTE_FAILED',
        message: error.message || 'Impossible de supprimer ce devis'
      }
    })
  }
})
