import { defineEventHandler, createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { convertQuoteToInvoice } from '../../../services/invoice.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  // SUPER_ADMIN and ACCOUNTANT allowed (COMMERCIAL cannot convert)
  const user = await requireRole(event, 'SUPER_ADMIN', 'ACCOUNTANT')
  const quoteId = event.context.params?.id

  if (!quoteId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant du devis requis' }
    })
  }

  try {
    const invoice = await convertQuoteToInvoice(quoteId, user.id)
    event.node.res.statusCode = 201
    return createSuccessResponse({ invoice })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflit',
      data: {
        code: 'CONVERT_QUOTE_FAILED',
        message: error.message || 'Échec de la conversion du devis en facture'
      }
    })
  }
})
