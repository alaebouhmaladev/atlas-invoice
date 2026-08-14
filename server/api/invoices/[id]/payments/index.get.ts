import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '../../../../utils/auth'
import { getInvoicePayments } from '../../../../services/payment.service'
import { createSuccessResponse } from '../../../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const invoiceId = event.context.params?.id

  if (!invoiceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant de facture requis' }
    })
  }

  const payments = await getInvoicePayments(invoiceId)
  return createSuccessResponse({ payments })
})
