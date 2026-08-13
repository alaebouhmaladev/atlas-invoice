import { describe, it, expect } from 'vitest'
import { calculateQuoteFinancials, formatMoney } from '../server/utils/calculation'

describe('Quote Financial Calculation Engine Tests', () => {
  describe('Line Calculations', () => {
    it('should correctly calculate standard single line with 20% TVA', () => {
      const items = [
        {
          title: 'Cocktail Traiteur 50p',
          quantity: 1,
          unit: 'Forfait',
          unitPriceHt: 1000,
          discountRate: 0,
          vatRate: 20
        }
      ]

      const result = calculateQuoteFinancials(items)

      expect(result.subtotalHt).toBe('1000.00')
      expect(result.lineDiscountsTotal).toBe('0.00')
      expect(result.globalDiscountTotal).toBe('0.00')
      expect(result.totalNetHt).toBe('1000.00')
      expect(result.totalVat).toBe('200.00')
      expect(result.totalTtc).toBe('1200.00')
    })

    it('should correctly calculate quantity with 3 decimal places', () => {
      const items = [
        {
          title: 'Viande Viande Halal (kg)',
          quantity: 12.575,
          unit: 'Unité',
          unitPriceHt: 120,
          discountRate: 0,
          vatRate: 20
        }
      ]

      const result = calculateQuoteFinancials(items)
      // 12.575 * 120 = 1509.00
      expect(result.subtotalHt).toBe('1509.00')
      expect(result.totalTtc).toBe('1810.80') // 1509 * 1.2 = 1810.80
    })

    it('should correctly handle line discounts', () => {
      const items = [
        {
          title: 'Pause Café Prestige',
          quantity: 100,
          unit: 'Personne',
          unitPriceHt: 50,
          discountRate: 10, // 10% discount
          vatRate: 20
        }
      ]

      const result = calculateQuoteFinancials(items)
      // Gross: 100 * 50 = 5000. Line Discount 10%: 500. Net HT: 4500. VAT 20%: 900. Total TTC: 5400.
      expect(result.subtotalHt).toBe('4500.00')
      expect(result.lineDiscountsTotal).toBe('500.00')
      expect(result.totalVat).toBe('900.00')
      expect(result.totalTtc).toBe('5400.00')
    })
  })

  describe('Mixed TVA Rates & Global Discounts', () => {
    it('should correctly handle mixed TVA rates (10% and 20%)', () => {
      const items = [
        {
          title: 'Repas Chaud (Catering)',
          quantity: 10,
          unit: 'Repas',
          unitPriceHt: 200,
          vatRate: 10 // 2000 HT -> 200 VAT
        },
        {
          title: 'Service Serveurs',
          quantity: 5,
          unit: 'Personne',
          unitPriceHt: 300,
          vatRate: 20 // 1500 HT -> 300 VAT
        }
      ]

      const result = calculateQuoteFinancials(items)

      expect(result.subtotalHt).toBe('3500.00')
      expect(result.totalVat).toBe('500.00')
      expect(result.totalTtc).toBe('4000.00')

      expect(result.vatBreakdown).toHaveLength(2)
      expect(result.vatBreakdown[0]).toEqual({ rate: '10.00', netAmountHt: '2000.00', vatAmount: '200.00' })
      expect(result.vatBreakdown[1]).toEqual({ rate: '20.00', netAmountHt: '1500.00', vatAmount: '300.00' })
    })

    it('should correctly apply global percentage discount proportionally', () => {
      const items = [
        {
          title: 'Buffet',
          quantity: 1,
          unit: 'Forfait',
          unitPriceHt: 10000,
          vatRate: 20
        }
      ]

      const result = calculateQuoteFinancials(items, { discountType: 'PERCENTAGE', discountValue: 5 })

      // 10000 HT - 5% (500 MAD) = 9500 Net HT. VAT 20% of 9500 = 1900. Total TTC = 11400.
      expect(result.subtotalHt).toBe('10000.00')
      expect(result.globalDiscountTotal).toBe('500.00')
      expect(result.totalNetHt).toBe('9500.00')
      expect(result.totalVat).toBe('1900.00')
      expect(result.totalTtc).toBe('11400.00')
    })

    it('should correctly apply global fixed MAD discount proportionally', () => {
      const items = [
        {
          title: 'Buffet Maroccan',
          quantity: 1,
          unit: 'Forfait',
          unitPriceHt: 10000,
          vatRate: 20
        }
      ]

      const result = calculateQuoteFinancials(items, { discountType: 'FIXED', discountValue: 1000 })

      expect(result.subtotalHt).toBe('10000.00')
      expect(result.globalDiscountTotal).toBe('1000.00')
      expect(result.totalNetHt).toBe('9000.00')
      expect(result.totalVat).toBe('1800.00')
      expect(result.totalTtc).toBe('10800.00')
    })
  })

  describe('Validation & Edge Cases', () => {
    it('should throw error if items list is empty', () => {
      expect(() => calculateQuoteFinancials([])).toThrow('au moins une ligne')
    })

    it('should throw error if quantity is <= 0', () => {
      const items = [{ title: 'Test', quantity: 0, unit: 'U', unitPriceHt: 100 }]
      expect(() => calculateQuoteFinancials(items)).toThrow('supérieure à zéro')
    })

    it('should throw error if fixed discount exceeds subtotal', () => {
      const items = [{ title: 'Test', quantity: 1, unit: 'U', unitPriceHt: 100 }]
      expect(() => calculateQuoteFinancials(items, { discountType: 'FIXED', discountValue: 150 })).toThrow('ne peut pas être supérieure au sous-total HT')
    })
  })

  describe('Money Formatting Helper', () => {
    it('should format numbers into French MAD representation', () => {
      expect(formatMoney(1250)).toBe('1 250,00 MAD')
      expect(formatMoney('1250000.50')).toBe('1 250 000,50 MAD')
    })
  })
})
