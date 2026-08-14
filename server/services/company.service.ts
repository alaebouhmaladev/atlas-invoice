export interface CompanySnapshotData {
  legalName: string
  tradingName?: string | null
  address: string
  addressComplement?: string | null
  city: string
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
  rib?: string | null
  signatureRef?: string | null
  cachetRef?: string | null
}

export function getCompanySnapshot(): CompanySnapshotData {
  return {
    legalName: process.env.COMPANY_LEGAL_NAME || 'Atlas Bites SARL',
    tradingName: process.env.COMPANY_TRADING_NAME || 'Atlas Bites Traiteur & Restauration',
    address: process.env.COMPANY_ADDRESS || '124 Boulevard Anfa, Etage 3',
    addressComplement: process.env.COMPANY_ADDRESS_COMPLEMENT || 'Gauthier',
    city: process.env.COMPANY_CITY || 'Casablanca',
    country: process.env.COMPANY_COUNTRY || 'Maroc',
    ice: process.env.COMPANY_ICE || '002987123000045',
    taxId: process.env.COMPANY_TAX_ID || '39482710',
    rc: process.env.COMPANY_RC || '192837',
    cnss: process.env.COMPANY_CNSS || '8472910',
    patent: process.env.COMPANY_PATENT || '34829104',
    phone: process.env.COMPANY_PHONE || '+212 522 99 88 77',
    email: process.env.COMPANY_EMAIL || 'contact@atlasbites.ma',
    website: process.env.COMPANY_WEBSITE || 'www.atlasbites.ma',
    bankName: process.env.COMPANY_BANK_NAME || 'Attijariwafa Bank',
    rib: process.env.COMPANY_RIB || '007 780 0001234567890123 45',
    signatureRef: process.env.COMPANY_SIGNATURE_REF || null,
    cachetRef: process.env.COMPANY_CACHET_REF || null
  }
}
