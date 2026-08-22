import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../utils/auth'
import { invoiceSchema } from '../../utils/validation'
import { createInvoice } from '../../services/invoice.service'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parseResult = invoiceSchema.safeParse(body)
  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Données de la facture invalides',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  try {
    const invoice = await createInvoice(parseResult.data, user.id)
    event.node.res.statusCode = 201
    return createSuccessResponse({ invoice })
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'CREATE_INVOICE_FAILED',
        message: error.message || 'Échec de la création de la facture'
      }
    })
  }
})
