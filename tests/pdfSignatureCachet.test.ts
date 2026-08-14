import { describe, it, expect } from 'vitest'
import { generateInvoicePdfBuffer } from '../server/services/invoicePdf.service'
import { normalizePdfImage } from '../server/services/pdf/pdfEngine'
import sharp from 'sharp'

async function createTestImage(text: string, width: number, height: number, color: string, isWhiteBg = false): Promise<Buffer> {
  const bg = isWhiteBg ? { r: 255, g: 255, b: 255, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 }
  const svg = `<svg width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${color}" rx="8"/>
    <text x="50%" y="55%" font-size="16" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
  </svg>`

  const canvasW = width * 3
  const canvasH = height * 3
  const top = Math.round((canvasH - height) / 2)
  const left = Math.round((canvasW - width) / 2)

  return sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: bg }
  })
  .composite([{ input: Buffer.from(svg), top, left }])
  .png()
  .toBuffer()
}

function getPageCount(pdfBuffer: Buffer): number {
  const matches = pdfBuffer.toString('binary').match(/\/Type\s*\/Page\b/g)
  return matches ? matches.length : 0
}

describe('PDF Signature & Cachet Rendering System', () => {
  const baseClient = {
    displayName: 'Client Test SARL',
    type: 'COMPANY',
    ice: '001122334455667',
    taxId: '12345678',
    rc: '88776',
    address: '100 Boulevard Anfa',
    city: 'Casablanca',
    country: 'Maroc'
  }

  const baseCompany = {
    legalName: 'ATLAS BITES SARL',
    tradingName: 'Services Traiteur',
    address: 'Angle Boulevard Roudani',
    city: 'Casablanca',
    country: 'Maroc',
    ice: '003677070000065',
    taxId: '66241085',
    rc: '666257',
    phone: '+212 664 44 47 66',
    email: 'contact@atlasbites-maroc.com',
    showSignatureOnPaidInvoice: true,
    showStampOnPaidInvoice: true
  }

  const baseItems = [
    {
      position: 1,
      title: 'Prestation Evènementielle VIP',
      quantity: 1,
      unit: 'Forfait',
      unitPriceHt: 10000,
      discountRate: 0,
      vatRate: 20,
      grossAmountHt: 10000,
      discountAmount: 0,
      netAmountHt: 10000,
      vatAmount: 2000,
      totalTtc: 12000
    }
  ]

  it('correctly trims transparent margins from signature source image', async () => {
    const rawImage = await createTestImage('SIGNATURE', 150, 50, '#1E40AF', false)
    const normalized = await normalizePdfImage(rawImage)

    expect(normalized).not.toBeNull()
    // Trimmed content = 150x50 + 8px padding (4px top/bottom/left/right) = 158x58
    expect(normalized?.width).toBe(158)
    expect(normalized?.height).toBe(58)
  })

  it('correctly trims white margins from signature/cachet source image', async () => {
    const rawImage = await createTestImage('CACHET', 100, 80, '#047857', true)
    const normalized = await normalizePdfImage(rawImage)

    expect(normalized).not.toBeNull()
    expect(normalized?.width).toBe(108)
    expect(normalized?.height).toBe(88)
  })

  it('preserves aspect ratio during image normalization', async () => {
    const rawImage = await createTestImage('WIDE SIG', 200, 40, '#B91C1C', false)
    const normalized = await normalizePdfImage(rawImage)

    expect(normalized).not.toBeNull()
    const contentW = (normalized?.width || 0) - 8
    const contentH = (normalized?.height || 0) - 8
    const ratio = contentW / contentH
    expect(ratio).toBeCloseTo(5.0, 1)
  })

  it('renders both signature and cachet in PAID panel fitting on exactly 1 page', async () => {
    const sigImg = await createTestImage('SIG', 140, 50, '#1E40AF', false)
    const stampImg = await createTestImage('STAMP', 90, 75, '#047857', true)

    const pdfBuffer = await generateInvoicePdfBuffer({
      id: 'fac-both-1',
      number: 'FAC-2026-0006',
      status: 'FINALIZED',
      paymentStatus: 'PAID',
      issueDate: new Date(),
      dueDate: new Date(),
      paidAt: new Date(),
      clientSnapshot: baseClient,
      companySnapshot: baseCompany,
      subtotalHt: 10000,
      discountAmount: 0,
      totalNetHt: 10000,
      totalVat: 2000,
      totalTtc: 12000,
      amountPaid: 12000,
      amountDue: 0,
      items: baseItems,
      payments: [{ paymentDate: new Date(), method: 'VIREMENT', amount: 12000 }]
    })

    expect(sigImg).toBeInstanceOf(Buffer)
    expect(stampImg).toBeInstanceOf(Buffer)
    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(getPageCount(pdfBuffer)).toBe(1)
  })

  it('renders signature-only configuration on 1 page', async () => {
    const pdfBuffer = await generateInvoicePdfBuffer({
      id: 'fac-sig-only-1',
      number: 'FAC-2026-0007',
      status: 'FINALIZED',
      paymentStatus: 'PAID',
      issueDate: new Date(),
      dueDate: new Date(),
      paidAt: new Date(),
      clientSnapshot: baseClient,
      companySnapshot: { ...baseCompany, showStampOnPaidInvoice: false },
      subtotalHt: 10000,
      discountAmount: 0,
      totalNetHt: 10000,
      totalVat: 2000,
      totalTtc: 12000,
      amountPaid: 12000,
      amountDue: 0,
      items: baseItems
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(getPageCount(pdfBuffer)).toBe(1)
  })

  it('renders cachet-only configuration on 1 page', async () => {
    const pdfBuffer = await generateInvoicePdfBuffer({
      id: 'fac-stamp-only-1',
      number: 'FAC-2026-0008',
      status: 'FINALIZED',
      paymentStatus: 'PAID',
      issueDate: new Date(),
      dueDate: new Date(),
      paidAt: new Date(),
      clientSnapshot: baseClient,
      companySnapshot: { ...baseCompany, showSignatureOnPaidInvoice: false },
      subtotalHt: 10000,
      discountAmount: 0,
      totalNetHt: 10000,
      totalVat: 2000,
      totalTtc: 12000,
      amountPaid: 12000,
      amountDue: 0,
      items: baseItems
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(getPageCount(pdfBuffer)).toBe(1)
  })

  it('renders no-assets configuration cleanly without fake placeholder text', async () => {
    const pdfBuffer = await generateInvoicePdfBuffer({
      id: 'fac-no-assets-1',
      number: 'FAC-2026-0009',
      status: 'FINALIZED',
      paymentStatus: 'PAID',
      issueDate: new Date(),
      dueDate: new Date(),
      paidAt: new Date(),
      clientSnapshot: baseClient,
      companySnapshot: { ...baseCompany, showSignatureOnPaidInvoice: false, showStampOnPaidInvoice: false },
      subtotalHt: 10000,
      discountAmount: 0,
      totalNetHt: 10000,
      totalVat: 2000,
      totalTtc: 12000,
      amountPaid: 12000,
      amountDue: 0,
      items: baseItems
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(getPageCount(pdfBuffer)).toBe(1)

    // Verify fake placeholder text "Signature et cachet" is NOT present
    const textContent = pdfBuffer.toString('utf8')
    expect(textContent).not.toContain('Signature et cachet (espace réservé)')
  })
})
