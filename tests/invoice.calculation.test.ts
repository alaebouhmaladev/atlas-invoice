import { describe, it, expect } from 'vitest'
import { calculateQuoteFinancials, formatMoney } from '../server/utils/calculation'

describe('Invoice Calculation Engine', () => {
  it('calculates invoice line items and financials accurately using Decimal.js', () => {
    const items = [
      {
        position: 1,
        title: 'Buffet Mariage Prestige (100 personnes)',
        quantity: 100,
        unit: 'Personne',
        unitPriceHt: 350,
        discountRate: 10, // 10% line discount
        vatRate: 20
      },
      {
        position: 2,
        title: 'Service Serveurs & Maitre d\'hôtel',
        quantity: 1,
        unit: 'Forfait',
        unitPriceHt: 5000,
        discountRate: 0,
        vatRate: 20
      }
    ]

    const result = calculateQuoteFinancials(items)

    // Gross item 1: 100 * 350 = 35,000 HT
    // Discount item 1: 3,500 HT -> Net: 31,500 HT, VAT (20%): 6,300, TTC: 37,800
    // Gross item 2: 5,000 HT -> Net: 5,000 HT, VAT (20%): 1,000, TTC: 6,000
    // Subtotal HT = 40,000
    // Total Line Discounts = 3,500
    // Total Net HT = 36,500
    // Total VAT = 7,300
    // Total TTC = 43,800

    expect(result.subtotalHt).toBe('36500.00')
    expect(result.discountAmount).toBe('3500.00')
    expect(result.totalNetHt).toBe('36500.00')
    expect(result.totalVat).toBe('7300.00')
    expect(result.totalTtc).toBe('43800.00')
  })

  it('calculates global percentage discount on invoice', () => {
    const items = [
      {
        position: 1,
        title: 'Service traiteur corporate',
        quantity: 2,
        unit: 'Jour',
        unitPriceHt: 10000,
        discountRate: 0,
        vatRate: 20
      }
    ]

    const result = calculateQuoteFinancials(items, {
      discountType: 'PERCENTAGE',
      discountValue: 5 // 5% global discount
    })

    // Subtotal HT: 20,000
    // Global Discount (5%): 1,000
    // Net HT: 19,000
    // VAT (20%): 3,800
    // Total TTC: 22,800

    expect(result.subtotalHt).toBe('20000.00')
    expect(result.discountAmount).toBe('1000.00')
    expect(result.totalNetHt).toBe('19000.00')
    expect(result.totalVat).toBe('3800.00')
    expect(result.totalTtc).toBe('22800.00')
  })

  it('formats money values in Moroccan Dirhams (MAD)', () => {
    expect(formatMoney(12345.67)).toBe('12 345,67 MAD')
    expect(formatMoney(0)).toBe('0,00 MAD')
  })
})
