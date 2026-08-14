import { defineEventHandler, getRouterParam, createError, setHeader } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { prisma } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.read')
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID d’employé manquant' })
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, photoAssetId: true }
  })

  if (!employee || !employee.photoAssetId) {
    throw createError({ statusCode: 404, message: 'Photo introuvable pour cet employé' })
  }

  const asset = await prisma.companyAsset.findUnique({
    where: { id: employee.photoAssetId }
  })

  if (!asset || !asset.data) {
    throw createError({ statusCode: 404, message: 'Fichier photo introuvable' })
  }

  setHeader(event, 'Content-Type', asset.mimeType || 'image/png')
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')

  return Buffer.from(asset.data)
})
