import { defineEventHandler, createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { finalizeInvoice } from '../../../services/invoice.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  // SUPER_ADMIN and ACCOUNTANT allowed
  const user = await requireRole(event, 'SUPER_ADMIN', 'ACCOUNTANT')
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant de facture requis' }
    })
  }

  try {
    const invoice = await finalizeInvoice(id, user.id)
    return createSuccessResponse({ invoice })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      data: {
        code: 'FINALIZE_INVOICE_FAILED',
        message: error.message || 'Échec de la finalisation de la facture'
      }
    })
  }
})
