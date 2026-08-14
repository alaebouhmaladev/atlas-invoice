import { defineEventHandler, createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { deleteInvoice } from '../../../services/invoice.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  // SUPER_ADMIN only
  const user = await requireRole(event, 'SUPER_ADMIN')
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant de facture requis' }
    })
  }

  try {
    await deleteInvoice(id, user.id)
    return createSuccessResponse({ message: 'Facture supprimée avec succès' })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'DELETE_INVOICE_FAILED',
        message: error.message || 'Échec de la suppression de la facture'
      }
    })
  }
})
