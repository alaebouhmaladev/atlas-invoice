import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { getClientDevis } from '../../../services/client360.service'

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

  const query = getQuery(event)
  const result = await getClientDevis(id, {
    page: query.page ? Number(query.page) : 1,
    pageSize: query.pageSize ? Number(query.pageSize) : 10,
    search: query.search as string | undefined,
    status: query.status as string | undefined,
    archiveStatus: query.archiveStatus as string | undefined
  })

  return {
    success: true,
    data: result
  }
})
