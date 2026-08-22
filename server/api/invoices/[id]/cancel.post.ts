import { defineEventHandler, readBody, createError } from 'h3'
import { requireRole } from '../../../utils/auth'
import { invoiceCancelSchema } from '../../../utils/validation'
import { cancelInvoice } from '../../../services/invoice.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  // SUPER_ADMIN only
  const user = await requireRole(event, 'SUPER_ADMIN')
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant de facture requis' }
    })
  }

  const body = await readBody(event)
  const parseResult = invoiceCancelSchema.safeParse(body)
  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Le motif d\'annulation est obligatoire',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  try {
    const invoice = await cancelInvoice(id, parseResult.data.reason, user.id)
    return createSuccessResponse({ invoice })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'CANCEL_INVOICE_FAILED',
        message: error.message || 'Échec de l\'annulation de la facture'
      }
    })
  }
})
