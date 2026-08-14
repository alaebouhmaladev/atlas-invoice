import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { CompanyAssetType } from '@prisma/client'
import { prisma } from '../server/utils/db'
import { validateImageBinary, uploadCompanyAsset, removeCompanyAsset } from '../server/services/asset.service'
import { getCompanySettings } from '../server/services/companySettings.service'

describe('Company Asset Security & Upload Unit Tests', () => {
  let userId: string
  let savedLogoId: string | null = null
  let savedSigId: string | null = null
  let savedStampId: string | null = null

  beforeAll(async () => {
    try {
      const origSettings = await prisma.companySettings.findUnique({ where: { singletonKey: 'DEFAULT' } })
      if (origSettings) {
        savedLogoId = origSettings.activeLogoAssetId
        savedSigId = origSettings.activeSignatureAssetId
        savedStampId = origSettings.activeStampAssetId
      }

      const user = await prisma.user.create({
        data: {
          name: 'Test Asset Admin',
          email: 'test.assets@atlasbites.ma',
          passwordHash: 'hashed_secret',
          role: 'SUPER_ADMIN'
        }
      })
      userId = user.id
    } catch {
      // ignore
    }
  })

  afterAll(async () => {
    try {
      if (userId) {
        await prisma.companyAsset.deleteMany({ where: { uploadedById: userId } })
        await prisma.auditLog.deleteMany({ where: { userId } })
        await prisma.user.deleteMany({ where: { id: userId } })
      }
      // Restore original company asset settings so unit test run never wipes live user data!
      await prisma.companySettings.update({
        where: { singletonKey: 'DEFAULT' },
        data: {
          activeLogoAssetId: savedLogoId,
          activeSignatureAssetId: savedSigId,
          activeStampAssetId: savedStampId
        }
      })
    } catch {
      // ignore
    }
  })

  it('should validate valid PNG magic bytes correctly', () => {
    // 8-byte PNG header: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 50])
    const validated = validateImageBinary(
      { originalName: 'logo.png', mimeType: 'image/png', size: pngHeader.length, buffer: pngHeader },
      CompanyAssetType.LOGO
    )
    expect(validated.mimeType).toBe('image/png')
  })

  it('should reject SVG uploads due to script embedded risks', () => {
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    expect(() =>
      validateImageBinary(
        { originalName: 'logo.svg', mimeType: 'image/svg+xml', size: svgBuffer.length, buffer: svgBuffer },
        CompanyAssetType.LOGO
      )
    ).toThrow('Seuls les formats PNG, JPEG et WebP fixes sont autorisés')
  })

  it('should reject GIF uploads due to animated format restrictions', () => {
    const gifBuffer = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00')
    expect(() =>
      validateImageBinary(
        { originalName: 'logo.gif', mimeType: 'image/gif', size: gifBuffer.length, buffer: gifBuffer },
        CompanyAssetType.LOGO
      )
    ).toThrow('Seuls les formats PNG, JPEG et WebP fixes sont autorisés')
  })

  it('should upload a valid PNG asset, update settings, and compute SHA-256', async () => {
    const pngHeader = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 50]),
      Buffer.from(`test-uniq-${Date.now()}`)
    ])
    const asset = await uploadCompanyAsset(
      CompanyAssetType.LOGO,
      { originalName: 'company_logo.png', mimeType: 'image/png', size: pngHeader.length, buffer: pngHeader },
      userId
    )

    expect(asset.id).toBeDefined()
    expect(asset.sha256).toBeDefined()
    expect(asset.type).toBe('LOGO')

    const settings = await getCompanySettings()
    expect(settings?.activeLogoAssetId).toBe(asset.id)
  })

  it('should remove active asset reference from settings when requested', async () => {
    await removeCompanyAsset(CompanyAssetType.LOGO, userId)
    const settings = await getCompanySettings()
    expect(settings?.activeLogoAssetId).toBeNull()
  })
})
