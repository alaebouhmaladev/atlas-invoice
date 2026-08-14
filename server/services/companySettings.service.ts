import { prisma } from '../utils/db'
import { companySettingsSchema, type CompanySettingsInput } from '../utils/validation'
import { createAuditLog } from './audit.service'

const SINGLETON_KEY = 'DEFAULT'

export async function getCompanySettings() {
  let settings = await prisma.companySettings.findUnique({
    where: { singletonKey: SINGLETON_KEY }
  })

  if (!settings) {
    // Idempotent initialization fallback
    settings = await prisma.companySettings.create({
      data: {
        singletonKey: SINGLETON_KEY,
        legalName: 'Atlas Bites SARL',
        tradeName: 'Atlas Bites Traiteur',
        legalForm: 'SARL',
        address: '123 Avenue Mohammed V',
        city: 'Casablanca',
        postalCode: '20000',
        country: 'Maroc',
        ice: '001234567890123',
        taxId: '12345678',
        rc: '98765',
        cnss: '1234567',
        patent: '54321',
        phone: '+212 5 22 00 11 22',
        email: 'contact@atlasbites.ma',
        website: 'https://atlasbites.ma',
        bankName: 'Attijariwafa Bank',
        accountHolder: 'Atlas Bites SARL',
        rib: '007 780 0001234567890123 45',
        iban: 'MA64007780000123456789012345',
        swiftBic: 'BCMA MA MC',
        defaultCurrency: 'MAD',
        defaultVatRate: 20,
        defaultQuoteValidityDays: 30,
        defaultInvoiceDueDays: 30,
        defaultPaymentTerms: 'Règlement sous 30 jours à réception de facture',
        defaultQuoteNotes: 'Merci pour votre confiance.',
        defaultInvoiceNotes: 'Facture payable selon les conditions convenues.',
        quotePrefix: 'DEV',
        invoicePrefix: 'FAC',
        showSignatureOnPaidInvoice: true,
        showStampOnPaidInvoice: true,
        showLogoOnDocuments: true,
        revision: 1
      }
    })
  }

  return settings
}

export async function updateCompanySettings(rawInput: any, userId: string) {
  const data = companySettingsSchema.parse(rawInput)
  const existing = await getCompanySettings()

  // Optimistic concurrency check
  if (existing.revision !== data.revision) {
    const error: any = new Error('Le document a été modifié par un autre utilisateur. Veuillez rafraîchir la page.')
    error.statusCode = 409
    error.code = 'REVISION_CONFLICT'
    throw error
  }

  const isQuotePrefixChanged = existing.quotePrefix !== data.quotePrefix
  const isInvoicePrefixChanged = existing.invoicePrefix !== data.invoicePrefix

  const nextRevision = existing.revision + 1

  const updated = await prisma.companySettings.update({
    where: { singletonKey: SINGLETON_KEY },
    data: {
      legalName: data.legalName,
      tradeName: data.tradeName,
      legalForm: data.legalForm,
      address: data.address,
      addressLine2: data.addressLine2,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country,
      ice: data.ice,
      taxId: data.taxId,
      rc: data.rc,
      cnss: data.cnss,
      patent: data.patent,
      phone: data.phone,
      secondaryPhone: data.secondaryPhone,
      email: data.email,
      website: data.website,
      bankName: data.bankName,
      accountHolder: data.accountHolder,
      rib: data.rib,
      iban: data.iban,
      swiftBic: data.swiftBic,
      defaultCurrency: data.defaultCurrency,
      defaultVatRate: data.defaultVatRate,
      defaultQuoteValidityDays: data.defaultQuoteValidityDays,
      defaultInvoiceDueDays: data.defaultInvoiceDueDays,
      defaultPaymentTerms: data.defaultPaymentTerms,
      defaultQuoteNotes: data.defaultQuoteNotes,
      defaultInvoiceNotes: data.defaultInvoiceNotes,
      quotePrefix: data.quotePrefix,
      invoicePrefix: data.invoicePrefix,
      showSignatureOnPaidInvoice: data.showSignatureOnPaidInvoice,
      showStampOnPaidInvoice: data.showStampOnPaidInvoice,
      showLogoOnDocuments: data.showLogoOnDocuments,
      revision: nextRevision,
      updatedById: userId
    }
  })

  // Log prefix changes explicitly if applicable
  if (isQuotePrefixChanged || isInvoicePrefixChanged) {
    await createAuditLog({
      userId,
      action: 'COMPANY_PREFIX_CHANGED',
      entityType: 'CompanySettings',
      entityId: updated.id,
      metadata: {
        previousQuotePrefix: existing.quotePrefix,
        newQuotePrefix: data.quotePrefix,
        previousInvoicePrefix: existing.invoicePrefix,
        newInvoicePrefix: data.invoicePrefix,
        revision: nextRevision
      }
    })
  }

  await createAuditLog({
    userId,
    action: 'COMPANY_SETTINGS_UPDATED',
    entityType: 'CompanySettings',
    entityId: updated.id,
    metadata: {
      revision: nextRevision,
      legalName: updated.legalName
    }
  })

  return updated
}
