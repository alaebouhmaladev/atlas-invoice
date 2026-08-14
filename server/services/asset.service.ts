import crypto from 'node:crypto'
import { CompanyAssetType } from '@prisma/client'
import { prisma } from '../utils/db'
import { getCompanySettings } from './companySettings.service'
import { createAuditLog } from './audit.service'

export interface UploadedFileMeta {
  originalName: string
  mimeType: string
  size: number
  buffer: Buffer
}

export function validateImageBinary(meta: UploadedFileMeta, type: CompanyAssetType): { mimeType: string; width?: number; height?: number } {
  const maxSize = type === CompanyAssetType.LOGO ? 2 * 1024 * 1024 : 1 * 1024 * 1024
  if (meta.size > maxSize) {
    const error: any = new Error(`La taille du fichier ne peut pas dépasser ${maxSize / (1024 * 1024)} Mo`)
    error.statusCode = 400
    throw error
  }

  const buf = meta.buffer
  if (!buf || buf.length < 12) {
    const error: any = new Error('Fichier d\'image invalide ou corrompu')
    error.statusCode = 400
    throw error
  }

  // Reject SVG and GIF
  const headerStr = buf.toString('utf8', 0, Math.min(buf.length, 100)).toLowerCase()
  if (headerStr.includes('<svg') || headerStr.includes('<?xml') || headerStr.startsWith('gif87a') || headerStr.startsWith('gif89a')) {
    const error: any = new Error('Seuls les formats PNG, JPEG et WebP fixes sont autorisés (SVG et GIF refusés)')
    error.statusCode = 400
    throw error
  }

  // Detect PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    let width: number | undefined
    let height: number | undefined
    if (buf.length >= 24) {
      width = buf.readUInt32BE(16)
      height = buf.readUInt32BE(20)
    }
    return { mimeType: 'image/png', width, height }
  }

  // Detect JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mimeType: 'image/jpeg' }
  }

  // Detect WebP
  if (buf.toString('utf8', 0, 4) === 'RIFF' && buf.toString('utf8', 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp' }
  }

  const error: any = new Error('Le type de fichier d\'image n\'est pas supporté (autorisés: PNG, JPEG, WebP)')
  error.statusCode = 400
  throw error
}

export async function uploadCompanyAsset(type: CompanyAssetType, fileMeta: UploadedFileMeta, userId: string) {
  const validated = validateImageBinary(fileMeta, type)
  const sha256 = crypto.createHash('sha256').update(fileMeta.buffer).digest('hex')

  const asset = await prisma.companyAsset.create({
    data: {
      type,
      originalName: fileMeta.originalName || `${type.toLowerCase()}.png`,
      mimeType: validated.mimeType,
      size: fileMeta.size,
      width: validated.width || null,
      height: validated.height || null,
      sha256,
      data: new Uint8Array(fileMeta.buffer),
      isActive: true,
      uploadedById: userId
    }
  })

  // Ensure singleton CompanySettings exists first
  const companySettings = await getCompanySettings()

  const updateData: any = {}
  if (type === CompanyAssetType.LOGO) updateData.activeLogoAssetId = asset.id
  if (type === CompanyAssetType.SIGNATURE) updateData.activeSignatureAssetId = asset.id
  if (type === CompanyAssetType.STAMP) updateData.activeStampAssetId = asset.id

  await prisma.companySettings.update({
    where: { singletonKey: companySettings.singletonKey },
    data: updateData
  })

  await createAuditLog({
    userId,
    action: 'COMPANY_ASSET_UPLOADED',
    entityType: 'CompanyAsset',
    entityId: asset.id,
    metadata: {
      type,
      originalName: asset.originalName,
      size: asset.size,
      sha256
    }
  })

  await createAuditLog({
    userId,
    action: 'COMPANY_ASSET_ACTIVATED',
    entityType: 'CompanyAsset',
    entityId: asset.id,
    metadata: { type }
  })

  return {
    id: asset.id,
    type: asset.type,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    sha256: asset.sha256,
    createdAt: asset.createdAt
  }
}

export async function getAssetById(assetId: string) {
  const asset = await prisma.companyAsset.findUnique({
    where: { id: assetId }
  })
  if (!asset) {
    const error: any = new Error('Ressource image introuvable')
    error.statusCode = 404
    throw error
  }
  return asset
}

export async function removeCompanyAsset(type: CompanyAssetType, userId: string) {
  const companySettings = await getCompanySettings()

  const updateData: any = {}
  if (type === CompanyAssetType.LOGO) updateData.activeLogoAssetId = null
  if (type === CompanyAssetType.SIGNATURE) updateData.activeSignatureAssetId = null
  if (type === CompanyAssetType.STAMP) updateData.activeStampAssetId = null

  await prisma.companySettings.update({
    where: { singletonKey: companySettings.singletonKey },
    data: updateData
  })

  await createAuditLog({
    userId,
    action: 'COMPANY_ASSET_REMOVED',
    entityType: 'CompanySettings',
    entityId: companySettings.singletonKey,
    metadata: { type }
  })

  return { success: true }
}
