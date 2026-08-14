import { describe, it, expect } from 'vitest'
import { generateInvoicePdfBuffer } from '../server/services/invoicePdf.service'

function getPdfPageCount(buffer: Buffer): number {
  const matches = buffer.toString('binary').match(/\/Type\s*\/Page\b/g)
  return matches ? matches.length : 0
}

describe('Invoice PDF Generation Service', () => {
  const baseClient = {
    displayName: 'Société Marocaine d\'Évènements',
    type: 'COMPANY',
    ice: '001122334455667',
    taxId: '12345678',
    rc: '88776',
    address: '50 Avenue FAR',
    city: 'Casablanca',
    country: 'Maroc'
  }

  const baseCompany = {
    legalName: 'Atlas Bites SARL',
    tradingName: 'Services Traiteur & Restauration',
    address: '124 Boulevard Anfa',
    city: 'Casablanca',
    country: 'Maroc',
    ice: '002987123000045',
    taxId: '39482710',
    phone: '+212 522 99 88 77',
    email: 'contact@atlasbites.ma',
    bankName: 'Attijariwafa Bank',
    rib: '007 780 0001234567890123 45'
  }

  const baseItems = [
    {
      position: 1,
      title: 'Cocktail Dînatoire VIP',
      quantity: 100,
      unit: 'Personne',
      unitPriceHt: 250,
      discountRate: 0,
      vatRate: 20,
      grossAmountHt: 25000,
      discountAmount: 0,
      netAmountHt: 25000,
      vatAmount: 5000,
      totalTtc: 30000
    }
  ]

  it('generates a valid PDF buffer for a draft invoice fitting on exactly 1 page', async () => {
    const pdfBuffer = await generateInvoicePdfBuffer({
      id: 'test-draft-id-12345',
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      clientSnapshot: baseClient,
      companySnapshot: baseCompany,
      subtotalHt: 25000,
      discountAmount: 0,
      totalNetHt: 25000,
      totalVat: 5000,
      totalTtc: 30000,
      amountPaid: 0,
      amountDue: 30000,
      items: baseItems
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(1000)
    expect(pdfBuffer.toString('utf8', 0, 5)).toBe('%PDF-')

    const pageCount = getPdfPageCount(pdfBuffer)
    expect(pageCount).toBe(1)
  })

  it('generates a valid PDF buffer for a finalized paid invoice (FACTURE ACQUITTÉE) on 1 page', async () => {
    const pdfBuffer = await generateInvoicePdfBuffer({
      id: 'test-finalized-id-67890',
      number: 'FAC-2026-0001',
      status: 'FINALIZED',
      paymentStatus: 'PAID',
      issueDate: new Date(),
      dueDate: new Date(),
      paidAt: new Date(),
      clientSnapshot: baseClient,
      companySnapshot: baseCompany,
      subtotalHt: 25000,
      discountAmount: 0,
      totalNetHt: 25000,
      totalVat: 5000,
      totalTtc: 30000,
      amountPaid: 30000,
      amountDue: 0,
      items: baseItems,
      payments: [
        {
          paymentDate: new Date(),
          method: 'BANK_TRANSFER',
          reference: 'VIR-889900',
          amount: 30000
        }
      ]
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(1000)

    const pageCount = getPdfPageCount(pdfBuffer)
    expect(pageCount).toBe(1)
  })

  it('generates a valid PDF buffer for a cancelled invoice (FACTURE ANNULÉE) on 1 page', async () => {
    const pdfBuffer = await generateInvoicePdfBuffer({
      id: 'test-cancelled-id-99',
      number: 'FAC-2026-0002',
      status: 'CANCELLED',
      paymentStatus: 'UNPAID',
      cancellationReason: 'Évènement annulé par le client',
      cancelledAt: new Date(),
      issueDate: new Date(),
      dueDate: new Date(),
      clientSnapshot: baseClient,
      companySnapshot: baseCompany,
      subtotalHt: 25000,
      discountAmount: 0,
      totalNetHt: 25000,
      totalVat: 5000,
      totalTtc: 30000,
      amountPaid: 0,
      amountDue: 30000,
      items: baseItems
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(1000)

    const pageCount = getPdfPageCount(pdfBuffer)
    expect(pageCount).toBe(1)
  })
})
