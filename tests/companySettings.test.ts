import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { getCompanySettings, updateCompanySettings } from '../server/services/companySettings.service'

describe('CompanySettings Service Unit Tests', () => {
  let userId: string
  let savedSettings: any = null

  beforeAll(async () => {
    try {
      savedSettings = await prisma.companySettings.findUnique({ where: { singletonKey: 'DEFAULT' } })

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
      // Restore user's real live CompanySettings so tests NEVER overwrite user changes!
      if (savedSettings) {
        await prisma.companySettings.update({
          where: { singletonKey: 'DEFAULT' },
          data: {
            legalName: savedSettings.legalName,
            tradeName: savedSettings.tradeName,
            legalForm: savedSettings.legalForm,
            address: savedSettings.address,
            addressLine2: savedSettings.addressLine2,
            city: savedSettings.city,
            postalCode: savedSettings.postalCode,
            country: savedSettings.country,
            ice: savedSettings.ice,
            taxId: savedSettings.taxId,
            rc: savedSettings.rc,
            cnss: savedSettings.cnss,
            patent: savedSettings.patent,
            phone: savedSettings.phone,
            secondaryPhone: savedSettings.secondaryPhone,
            email: savedSettings.email,
            website: savedSettings.website,
            bankName: savedSettings.bankName,
            accountHolder: savedSettings.accountHolder,
            rib: savedSettings.rib,
            iban: savedSettings.iban,
            swiftBic: savedSettings.swiftBic,
            defaultCurrency: savedSettings.defaultCurrency,
            defaultVatRate: savedSettings.defaultVatRate,
            defaultQuoteValidityDays: savedSettings.defaultQuoteValidityDays,
            defaultInvoiceDueDays: savedSettings.defaultInvoiceDueDays,
            defaultPaymentTerms: savedSettings.defaultPaymentTerms,
            defaultQuoteNotes: savedSettings.defaultQuoteNotes,
            defaultInvoiceNotes: savedSettings.defaultInvoiceNotes,
            quotePrefix: savedSettings.quotePrefix,
            invoicePrefix: savedSettings.invoicePrefix,
            showSignatureOnPaidInvoice: savedSettings.showSignatureOnPaidInvoice,
            showStampOnPaidInvoice: savedSettings.showStampOnPaidInvoice,
            showLogoOnDocuments: savedSettings.showLogoOnDocuments,
            activeLogoAssetId: savedSettings.activeLogoAssetId,
            activeSignatureAssetId: savedSettings.activeSignatureAssetId,
            activeStampAssetId: savedSettings.activeStampAssetId
          }
        })
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
