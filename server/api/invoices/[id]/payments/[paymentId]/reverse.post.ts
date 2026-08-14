import { defineEventHandler, readBody, createError } from 'h3'
import { requireRole } from '../../../../../utils/auth'
import { paymentReversalSchema } from '../../../../../utils/validation'
import { reversePayment } from '../../../../../services/payment.service'
import { createSuccessResponse } from '../../../../../utils/response'

export default defineEventHandler(async (event) => {
  // SUPER_ADMIN and ACCOUNTANT only
  const user = await requireRole(event, 'SUPER_ADMIN', 'ACCOUNTANT')
  const invoiceId = event.context.params?.id
  const paymentId = event.context.params?.paymentId

  if (!invoiceId || !paymentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiants de facture et paiement requis' }
    })
  }

  const body = await readBody(event)
  const parseResult = paymentReversalSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Le motif d\'annulation du paiement est obligatoire',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  try {
    const result = await reversePayment(invoiceId, paymentId, parseResult.data.reason, user.id)
    return createSuccessResponse(result)
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'REVERSE_PAYMENT_FAILED',
        message: error.message || 'Échec de l\'annulation du paiement'
      }
    })
  }
})
