import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { getInvoiceById } from '../../../services/invoice.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant de facture requis' }
    })
  }

  const invoice = await getInvoiceById(id)
  if (!invoice) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      data: { code: 'INVOICE_NOT_FOUND', message: 'Facture introuvable' }
    })
  }

  return createSuccessResponse({ invoice })
})
