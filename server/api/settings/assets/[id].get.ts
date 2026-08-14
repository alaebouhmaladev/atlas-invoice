import { defineEventHandler, getRouterParam, setResponseHeaders, createError } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { getAssetById } from '~/server/services/asset.service'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'MISSING_ASSET_ID', message: 'L\'identifiant de la ressource est requis' }
    })
  }

  const asset = await getAssetById(id)

  setResponseHeaders(event, {
    'Content-Type': asset.mimeType,
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `inline; filename="${asset.originalName.replace(/"/g, '')}"`,
    'Cache-Control': 'private, no-cache, no-store, must-revalidate'
  })

  return asset.data
})
