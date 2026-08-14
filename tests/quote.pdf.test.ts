import { describe, it, expect } from 'vitest'
import { generateQuotePdfBuffer } from '../server/services/pdf.service'

function getPdfPageCount(buffer: Buffer): number {
  const matches = buffer.toString('binary').match(/\/Type\s*\/Page\b/g)
  return matches ? matches.length : 0
}

describe('Quote PDF Service Tests', () => {
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
    email: 'contact@atlasbites.ma'
  }

  const baseItems = [
    {
      position: 1,
      title: 'Cocktail Dînatoire VIP',
      description: 'Assortiment de pièces fines salées et sucrées.',
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

  it('should generate a valid PDF buffer for a draft quote fitting on exactly 1 page', async () => {
    const pdfBuffer = await generateQuotePdfBuffer({
      id: 'quote-draft-1',
      number: 'DEV-2026-0001',
      status: 'DRAFT',
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 86400000),
      clientSnapshot: baseClient,
      companySnapshot: baseCompany,
      subtotalHt: 25000,
      discountAmount: 0,
      totalNetHt: 25000,
      totalVat: 5000,
      totalTtc: 30000,
      subject: 'Cocktail Professionnel VIP',
      items: baseItems
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(1000)
    expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-')

    const pageCount = getPdfPageCount(pdfBuffer)
    expect(pageCount).toBe(1)
  })

  it('should generate a valid PDF buffer for an accepted quote on exactly 1 page', async () => {
    const pdfBuffer = await generateQuotePdfBuffer({
      id: 'quote-accepted-2',
      number: 'DEV-2026-0002',
      status: 'ACCEPTED',
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 86400000),
      clientSnapshot: baseClient,
      companySnapshot: baseCompany,
      subtotalHt: 25000,
      discountAmount: 0,
      totalNetHt: 25000,
      totalVat: 5000,
      totalTtc: 30000,
      items: baseItems
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(1000)

    const pageCount = getPdfPageCount(pdfBuffer)
    expect(pageCount).toBe(1)
  })

  it('should generate a multipage PDF buffer for quotes with 30 line items without blank pages', async () => {
    const manyItems = Array.from({ length: 30 }, (_, i) => ({
      position: i + 1,
      title: `Prestation Restauration N° ${i + 1}`,
      quantity: 1,
      unit: 'Forfait',
      unitPriceHt: 1000,
      discountRate: 0,
      vatRate: 20,
      grossAmountHt: 1000,
      discountAmount: 0,
      netAmountHt: 1000,
      vatAmount: 200,
      totalTtc: 1200
    }))

    const pdfBuffer = await generateQuotePdfBuffer({
      id: 'quote-multipage-3',
      number: 'DEV-2026-0003',
      status: 'SENT',
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 86400000),
      clientSnapshot: baseClient,
      companySnapshot: baseCompany,
      subtotalHt: 30000,
      discountAmount: 0,
      totalNetHt: 30000,
      totalVat: 6000,
      totalTtc: 36000,
      items: manyItems
    })

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(3000)

    const pageCount = getPdfPageCount(pdfBuffer)
    expect(pageCount).toBe(2)
  })
})
