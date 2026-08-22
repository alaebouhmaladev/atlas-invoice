import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { getClientSummary } from '../../../services/client360.service'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant client requis' }
    })
  }

  const summary = await getClientSummary(id)

  return {
    success: true,
    data: summary
  }
})
