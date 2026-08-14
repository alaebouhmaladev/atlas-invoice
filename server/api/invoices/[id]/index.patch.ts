import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { invoiceUpdateSchema } from '../../../utils/validation'
import { updateInvoice } from '../../../services/invoice.service'
import { createSuccessResponse } from '../../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant de facture requis' }
    })
  }

  const body = await readBody(event)
  const parseResult = invoiceUpdateSchema.safeParse(body)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Données de mise à jour invalides',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  try {
    const invoice = await updateInvoice(id, parseResult.data, user.id)
    return createSuccessResponse({ invoice })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: {
        code: 'UPDATE_INVOICE_FAILED',
        message: error.message || 'Échec de la mise à jour de la facture'
      }
    })
  }
})
