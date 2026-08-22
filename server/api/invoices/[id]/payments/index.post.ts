import { defineEventHandler, readBody, createError } from 'h3'
import { requireRole } from '../../../../utils/auth'
import { paymentSchema } from '../../../../utils/validation'
import { addPayment } from '../../../../services/payment.service'
import { createSuccessResponse } from '../../../../utils/response'

export default defineEventHandler(async (event) => {
  // SUPER_ADMIN and ACCOUNTANT only
  const user = await requireRole(event, 'SUPER_ADMIN', 'ACCOUNTANT')
  const invoiceId = event.context.params?.id

  if (!invoiceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant de facture requis' }
    })
  }

  const body = await readBody(event)
  const parseResult = paymentSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Données de paiement invalides',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  try {
    const result = await addPayment(invoiceId, parseResult.data, user.id)
    event.node.res.statusCode = 201
    return createSuccessResponse(result)
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'ADD_PAYMENT_FAILED',
        message: error.message || 'Échec de l\'enregistrement du paiement'
      }
    })
  }
})
