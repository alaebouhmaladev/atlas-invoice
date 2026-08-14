import type { InvoiceStatus, PaymentStatus } from '@prisma/client'
import { prisma } from '../utils/db'
import { buildSharedPdfDocument, type SharedPdfItem, type SharedPaymentRecord } from './pdf/pdfEngine'
import type { ClientSnapshotData } from './pdf.service'
import type { CompanySnapshotData } from './company.service'

export interface InvoicePdfItem {
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

export interface PaymentPdfRecord {
  paymentDate: Date | string
  method: string
  reference?: string | null
  amount: string | number
}

export interface InvoicePdfData {
  id: string
  number?: string | null
  status: InvoiceStatus
  paymentStatus: PaymentStatus
  issueDate: Date | string
  dueDate: Date | string
  clientSnapshot: ClientSnapshotData
  companySnapshot: CompanySnapshotData
  currency?: string
  subtotalHt: string | number
  discountAmount: string | number
  totalNetHt: string | number
  totalVat: string | number
  totalTtc: string | number
  amountPaid: string | number
  amountDue: string | number
  subject?: string | null
  paymentTerms?: string | null
  publicNotes?: string | null
  cancellationReason?: string | null
  cancelledAt?: Date | string | null
  paidAt?: Date | string | null
  items: InvoicePdfItem[]
  payments?: PaymentPdfRecord[]
}

export async function generateInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  let logoBuffer: Buffer | null = null
  let signatureBuffer: Buffer | null = null
  let stampBuffer: Buffer | null = null

  // Fetch real live company settings from Paramètres (PostgreSQL)
  let dbSettings: any = null
  try {
    dbSettings = await prisma.companySettings.findUnique({ where: { singletonKey: 'DEFAULT' } })
  } catch {
    // fallback
  }

  const snap = (data.companySnapshot as any) || {}
  const companySnapshot: CompanySnapshotData = {
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
    showSignatureOnPaidInvoice: snap.showSignatureOnPaidInvoice ?? dbSettings?.showSignatureOnPaidInvoice ?? true,
    showStampOnPaidInvoice: snap.showStampOnPaidInvoice ?? dbSettings?.showStampOnPaidInvoice ?? true,
    activeLogoAssetId: snap.activeLogoAssetId || dbSettings?.activeLogoAssetId || null,
    activeSignatureAssetId: snap.activeSignatureAssetId || dbSettings?.activeSignatureAssetId || null,
    activeStampAssetId: snap.activeStampAssetId || dbSettings?.activeStampAssetId || null
  }

  let logoId = companySnapshot.activeLogoAssetId
  let sigId = companySnapshot.activeSignatureAssetId
  let stampId = companySnapshot.activeStampAssetId

  // Load binary asset data from DB
  const assetIds = [logoId, sigId, stampId].filter(Boolean) as string[]
  if (assetIds.length > 0) {
    try {
      const assets = await prisma.companyAsset.findMany({
        where: { id: { in: assetIds } }
      })
      for (const a of assets) {
        if (a.id === logoId && a.data) logoBuffer = Buffer.from(a.data)
        if (a.id === sigId && a.data) signatureBuffer = Buffer.from(a.data)
        if (a.id === stampId && a.data) stampBuffer = Buffer.from(a.data)
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

  const payments: SharedPaymentRecord[] = (data.payments || []).map((p) => ({
    paymentDate: p.paymentDate,
    method: p.method,
    reference: p.reference,
    amount: p.amount
  }))

  return buildSharedPdfDocument({
    type: 'INVOICE',
    id: data.id,
    number: data.number,
    status: data.status,
    paymentStatus: data.paymentStatus,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    paidAt: data.paidAt,
    cancelledAt: data.cancelledAt,
    cancellationReason: data.cancellationReason,
    clientSnapshot: data.clientSnapshot,
    companySnapshot,
    currency: data.currency || 'MAD',
    subtotalHt: data.subtotalHt,
    discountAmount: data.discountAmount,
    totalNetHt: data.totalNetHt,
    totalVat: data.totalVat,
    totalTtc: data.totalTtc,
    amountPaid: data.amountPaid,
    amountDue: data.amountDue,
    subject: data.subject,
    paymentTerms: data.paymentTerms,
    publicNotes: data.publicNotes,
    items,
    payments,
    logoBuffer,
    signatureBuffer,
    stampBuffer
  })
}
