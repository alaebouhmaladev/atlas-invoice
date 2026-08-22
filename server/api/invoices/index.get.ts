import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAuth } from '../../utils/auth'
import { invoiceQuerySchema } from '../../utils/validation'
import { getInvoices } from '../../services/invoice.service'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const query = getQuery(event)
  const parseResult = invoiceQuerySchema.safeParse(query)

  if (!parseResult.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'VALIDATION_ERROR',
        message: 'Paramètres de recherche invalides',
        errors: parseResult.error.flatten().fieldErrors
      }
    })
  }

  const result = await getInvoices(parseResult.data)
  return createSuccessResponse(result)
})
