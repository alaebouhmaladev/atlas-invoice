import { prisma } from '../utils/db'
import { buildSharedPdfDocument, type SharedPdfItem } from './pdf/pdfEngine'

export interface ClientSnapshotData {
  displayName: string
  type: string
  companyName?: string | null
  firstName?: string | null
  lastName?: string | null
  ice?: string | null
  taxId?: string | null
  rc?: string | null
  cnss?: string | null
  patent?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  addressLine2?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  contactName?: string | null
}

export interface QuotePdfItem {
  position: number
  title: string
  description?: string | null
  quantity: string | number
  unit: string
  unitPriceHt: string | number
  discountRate: string | number
  vatRate: string | number
  grossAmountHt: string | number
  discountAmount: string | number
  netAmountHt: string | number
  vatAmount: string | number
  totalTtc: string | number
}

export interface QuotePdfData {
  id?: string
  number: string
  issueDate: Date | string
  validUntil: Date | string
  clientSnapshot: ClientSnapshotData
  companySnapshot?: any
  currency?: string
  subtotalHt: string | number
  discountAmount: string | number
  totalNetHt: string | number
  totalVat: string | number
  totalTtc: string | number
  subject?: string | null
  paymentTerms?: string | null
  publicNotes?: string | null
  status?: string
  items: QuotePdfItem[]
}

export async function generateQuotePdfBuffer(data: QuotePdfData): Promise<Buffer> {
  let logoBuffer: Buffer | null = null

  // Fetch real live company settings from Paramètres (PostgreSQL)
  let dbSettings: any = null
  try {
    dbSettings = await prisma.companySettings.findUnique({ where: { singletonKey: 'DEFAULT' } })
  } catch {
    // fallback
  }

  const snap = (data.companySnapshot as any) || {}
  const companySnapshot = {
    legalName: snap.legalName || dbSettings?.legalName || 'ATLAS BITES',
    tradingName: snap.tradingName || snap.tradeName || dbSettings?.tradeName || 'ALAE BOUHMALA',
    legalForm: snap.legalForm || dbSettings?.legalForm || 'SARLU',
    address: snap.address || dbSettings?.address || 'Angle boulevard Roudani et, Rue du Louvre, Casablanca 20300',
    addressLine2: snap.addressLine2 || dbSettings?.addressLine2 || null,
    city: snap.city || dbSettings?.city || 'Casablanca',
    postalCode: snap.postalCode || dbSettings?.postalCode || null,
    country: snap.country || dbSettings?.country || 'Maroc',
    ice: snap.ice || dbSettings?.ice || '003677070000065',
    taxId: snap.taxId || dbSettings?.taxId || '66241085',
    rc: snap.rc || dbSettings?.rc || '666257',
    cnss: snap.cnss || dbSettings?.cnss || '5994287',
    phone: snap.phone || dbSettings?.phone || '+212 664 44 47 66',
    email: snap.email || dbSettings?.email || 'contact@atlasbites-maroc.com',
    bankName: snap.bankName || dbSettings?.bankName || 'AttijariWafa Bank',
    accountHolder: snap.accountHolder || dbSettings?.accountHolder || 'ATLAS BITES',
    rib: snap.rib || dbSettings?.rib || '077 780 0001271000001058 40',
    iban: snap.iban || dbSettings?.iban || null,
    swiftBic: snap.swiftBic || dbSettings?.swiftBic || null,
    showLogoOnDocuments: snap.showLogoOnDocuments ?? dbSettings?.showLogoOnDocuments ?? true,
    activeLogoAssetId: snap.activeLogoAssetId || dbSettings?.activeLogoAssetId || null
  }

  let logoId = companySnapshot.activeLogoAssetId

  // Load asset binary from PostgreSQL if asset ID exists
  if (logoId) {
    try {
      const asset = await prisma.companyAsset.findUnique({ where: { id: logoId } })
      if (asset?.data) {
        logoBuffer = Buffer.from(asset.data)
      }
    } catch {
      // fallback
    }
  }

  const items: SharedPdfItem[] = data.items.map((it) => ({
    position: it.position,
    title: it.title,
    description: it.description,
    quantity: it.quantity,
    unit: it.unit,
    unitPriceHt: it.unitPriceHt,
    discountRate: it.discountRate,
    vatRate: it.vatRate,
    grossAmountHt: it.grossAmountHt,
    discountAmount: it.discountAmount,
    netAmountHt: it.netAmountHt,
    vatAmount: it.vatAmount,
    totalTtc: it.totalTtc
  }))

  return buildSharedPdfDocument({
    type: 'QUOTE',
    id: data.id || 'quote-id',
    number: data.number,
    status: data.status || 'SENT',
    issueDate: data.issueDate,
    validUntil: data.validUntil,
    clientSnapshot: data.clientSnapshot,
    companySnapshot,
    currency: data.currency || 'MAD',
    subtotalHt: data.subtotalHt,
    discountAmount: data.discountAmount,
    totalNetHt: data.totalNetHt,
    totalVat: data.totalVat,
    totalTtc: data.totalTtc,
    subject: data.subject,
    paymentTerms: data.paymentTerms,
    publicNotes: data.publicNotes,
    items,
    logoBuffer
  })
}
