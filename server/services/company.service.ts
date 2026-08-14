import { getCompanySettings } from './companySettings.service'

export interface CompanySnapshotData {
  legalName: string
  tradingName?: string | null
  tradeName?: string | null
  legalForm?: string | null
  address: string
  addressLine2?: string | null
  addressComplement?: string | null
  city: string
  postalCode?: string | null
  country: string
  ice: string
  taxId?: string | null
  rc?: string | null
  cnss?: string | null
  patent?: string | null
  phone: string
  email: string
  website?: string | null
  bankName?: string | null
  accountHolder?: string | null
  rib?: string | null
  iban?: string | null
  swiftBic?: string | null
  showSignatureOnPaidInvoice?: boolean
  showStampOnPaidInvoice?: boolean
  showLogoOnDocuments?: boolean
  activeLogoAssetId?: string | null
  activeSignatureAssetId?: string | null
  activeStampAssetId?: string | null
}

export async function getCompanySnapshot(): Promise<CompanySnapshotData> {
  try {
    const settings = await getCompanySettings()
    return {
      legalName: settings.legalName,
      tradingName: settings.tradeName || settings.legalName,
      address: settings.address || '123 Avenue Mohammed V',
      addressComplement: settings.addressLine2 || null,
      city: settings.city || 'Casablanca',
      country: settings.country || 'Maroc',
      ice: settings.ice || '001234567890123',
      taxId: settings.taxId || null,
      rc: settings.rc || null,
      cnss: settings.cnss || null,
      patent: settings.patent || null,
      phone: settings.phone || '+212 5 22 00 11 22',
      email: settings.email || 'contact@atlasbites.ma',
      website: settings.website || 'https://atlasbites.ma',
      bankName: settings.bankName || 'Attijariwafa Bank',
      accountHolder: settings.accountHolder || settings.legalName,
      rib: settings.rib || '007 780 0001234567890123 45',
      iban: settings.iban || null,
      swiftBic: settings.swiftBic || null,
      showSignatureOnPaidInvoice: settings.showSignatureOnPaidInvoice,
      showStampOnPaidInvoice: settings.showStampOnPaidInvoice,
      showLogoOnDocuments: settings.showLogoOnDocuments,
      activeLogoAssetId: settings.activeLogoAssetId,
      activeSignatureAssetId: settings.activeSignatureAssetId,
      activeStampAssetId: settings.activeStampAssetId
    }
  } catch {
    return {
      legalName: 'Atlas Bites SARL',
      tradingName: 'Atlas Bites Traiteur & Restauration',
      address: '124 Boulevard Anfa, Etage 3',
      addressComplement: 'Gauthier',
      city: 'Casablanca',
      country: 'Maroc',
      ice: '002987123000045',
      taxId: '39482710',
      rc: '192837',
      cnss: '8472910',
      patent: '34829104',
      phone: '+212 522 99 88 77',
      email: 'contact@atlasbites.ma',
      website: 'www.atlasbites.ma',
      bankName: 'Attijariwafa Bank',
      rib: '007 780 0001234567890123 45',
      showSignatureOnPaidInvoice: true,
      showStampOnPaidInvoice: true,
      showLogoOnDocuments: true,
      activeLogoAssetId: null,
      activeSignatureAssetId: null,
      activeStampAssetId: null
    }
  }
}
