import { describe, it, expect } from 'vitest'
import { generateQuotePdfBuffer } from '../server/services/pdf.service'

describe('Quote PDF Service Tests', () => {
  it('should generate a non-empty A4 PDF buffer with valid header', async () => {
    const pdfData = {
      number: 'DEV-2026-0001',
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      clientSnapshot: {
        displayName: 'Atlas Catering SARL',
        type: 'COMPANY',
        ice: '001234567890123',
        taxId: '12345678',
        city: 'Casablanca'
      },
      subtotalHt: '1000.00',
      discountAmount: '0.00',
      totalNetHt: '1000.00',
      totalVat: '200.00',
      totalTtc: '1200.00',
      subject: 'Prestation Traiteur Evénement',
      items: [
        {
          position: 1,
          title: 'Cocktail Traiteur 50 personnes',
          description: 'Amuse-bouches salés et sucrés',
          quantity: 1,
          unit: 'Forfait',
          unitPriceHt: '1000.00',
          discountRate: '0.00',
          vatRate: '20.00',
          grossAmountHt: '1000.00',
          discountAmount: '0.00',
          netAmountHt: '1000.00',
          vatAmount: '200.00',
          totalTtc: '1200.00'
        }
      ]
    }

    const pdfBuffer = await generateQuotePdfBuffer(pdfData)

    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(1000)
    // Check standard PDF header magic bytes %PDF-
    const headerStr = pdfBuffer.slice(0, 5).toString('ascii')
    expect(headerStr).toBe('%PDF-')
  })
})
