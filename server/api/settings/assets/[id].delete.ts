import { defineEventHandler, getRouterParam, getQuery, createError } from 'h3'
import { CompanyAssetType } from '@prisma/client'
import { requireSuperAdmin } from '~/server/utils/auth'
import { removeCompanyAsset } from '~/server/services/asset.service'

export default defineEventHandler(async (event) => {
  const user = await requireSuperAdmin(event)
  const query = getQuery(event)
  const typeParam = query.type as string

  if (!typeParam || !['LOGO', 'SIGNATURE', 'STAMP'].includes(typeParam.toUpperCase())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ASSET_TYPE', message: 'Le type de ressource est requis (LOGO, SIGNATURE, STAMP)' }
    })
  }

  const type = typeParam.toUpperCase() as CompanyAssetType
  const result = await removeCompanyAsset(type, user.id)

  return {
    success: true,
    data: result
  }
})
