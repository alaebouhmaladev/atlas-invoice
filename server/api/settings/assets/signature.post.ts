import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { CompanyAssetType } from '@prisma/client'
import { requireSuperAdmin } from '~/server/utils/auth'
import { uploadCompanyAsset } from '~/server/services/asset.service'

export default defineEventHandler(async (event) => {
  const user = await requireSuperAdmin(event)
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'NO_FILE_UPLOADED', message: 'Aucun fichier n\'a été fourni' }
    })
  }

  const fileItem = formData.find((item) => item.name === 'file' || item.name === 'asset' || !!item.filename) || formData[0]
  if (!fileItem || !fileItem.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_FILE', message: 'Fichier invalide ou corrompu' }
    })
  }

  const asset = await uploadCompanyAsset(
    CompanyAssetType.SIGNATURE,
    {
      originalName: fileItem.filename || 'signature.png',
      mimeType: fileItem.type || 'image/png',
      size: fileItem.data.length,
      buffer: fileItem.data
    },
    user.id
  )

  return {
    success: true,
    data: asset
  }
})
