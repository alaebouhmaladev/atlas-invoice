import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { getCompanySettings, updateCompanySettings } from '../server/services/companySettings.service'

describe('CompanySettings Service Unit Tests', () => {
  let userId: string

  beforeAll(async () => {
    try {
      const user = await prisma.user.create({
        data: {
          name: 'Test Admin Settings',
          email: 'test.settings@atlasbites.ma',
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
        await prisma.auditLog.deleteMany({ where: { userId } })
        await prisma.user.deleteMany({ where: { id: userId } })
      }
    } catch {
      // ignore
    }
  })

  it('should initialize or fetch singleton CompanySettings record', async () => {
    const settings = await getCompanySettings()
    expect(settings).toBeDefined()
    expect(settings.singletonKey).toBe('DEFAULT')
    expect(settings.legalName).toBeDefined()
    expect(settings.revision).toBeGreaterThanOrEqual(1)
  })

  it('should update company settings and increment revision number', async () => {
    const current = await getCompanySettings()
    const updated = await updateCompanySettings(
      {
        legalName: 'Atlas Bites Traiteur EURL',
        tradeName: 'Atlas Bites Events',
        legalForm: 'EURL',
        address: '100 Boulevard Hassan II',
        city: 'Casablanca',
        country: 'Maroc',
        ice: '001234567890123',
        taxId: '12345678',
        phone: '+212 522 99 00 11',
        email: 'info@atlasbites.ma',
        defaultCurrency: 'MAD',
        defaultVatRate: 20,
        defaultQuoteValidityDays: 30,
        defaultInvoiceDueDays: 30,
        quotePrefix: 'DEV',
        invoicePrefix: 'FAC',
        showSignatureOnPaidInvoice: true,
        showStampOnPaidInvoice: true,
        showLogoOnDocuments: true,
        revision: current.revision
      },
      userId
    )

    expect(updated.legalName).toBe('Atlas Bites Traiteur EURL')
    expect(updated.revision).toBe(current.revision + 1)
  })

  it('should reject updates with stale revision numbers with 409 conflict', async () => {
    const current = await getCompanySettings()
    await expect(
      updateCompanySettings(
        {
          legalName: 'Stale Update Name',
          defaultCurrency: 'MAD',
          defaultVatRate: 20,
          defaultQuoteValidityDays: 30,
          defaultInvoiceDueDays: 30,
          quotePrefix: 'DEV',
          invoicePrefix: 'FAC',
          showSignatureOnPaidInvoice: true,
          showStampOnPaidInvoice: true,
          showLogoOnDocuments: true,
          revision: current.revision - 1 // Stale revision
        },
        userId
      )
    ).rejects.toThrow('Le document a été modifié par un autre utilisateur')
  })
})
