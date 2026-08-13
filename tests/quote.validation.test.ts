import { describe, it, expect } from 'vitest'
import { quoteSchema, quoteItemSchema } from '../server/utils/validation'

describe('Quote Zod Validation Tests', () => {
  describe('Quote Item Validation', () => {
    it('should validate a valid quote item', () => {
      const input = {
        title: 'Cocktail Traiteur',
        quantity: 50,
        unit: 'Personne',
        unitPriceHt: 120,
        discountRate: 5,
        vatRate: 20
      }

      const result = quoteItemSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject quote item missing title or with negative price/quantity', () => {
      const missingTitle = { quantity: 1, unit: 'U', unitPriceHt: 100 }
      expect(quoteItemSchema.safeParse(missingTitle).success).toBe(false)

      const zeroQty = { title: 'Test', quantity: 0, unit: 'U', unitPriceHt: 100 }
      expect(quoteItemSchema.safeParse(zeroQty).success).toBe(false)

      const negativePrice = { title: 'Test', quantity: 1, unit: 'U', unitPriceHt: -50 }
      expect(quoteItemSchema.safeParse(negativePrice).success).toBe(false)
    })
  })

  describe('Quote Payload Validation', () => {
    it('should validate a valid quote creation payload', () => {
      const input = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        issueDate: '2026-08-13',
        validUntil: '2026-09-13',
        subject: 'Prestation Mariage',
        items: [
          {
            title: 'Buffet Royal',
            quantity: 100,
            unit: 'Personne',
            unitPriceHt: 250,
            vatRate: 20
          }
        ]
      }

      const result = quoteSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject quote without clientId or with empty items array', () => {
      const missingClient = {
        issueDate: '2026-08-13',
        validUntil: '2026-09-13',
        items: [{ title: 'Test', quantity: 1, unit: 'U', unitPriceHt: 100 }]
      }
      expect(quoteSchema.safeParse(missingClient).success).toBe(false)

      const emptyItems = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        issueDate: '2026-08-13',
        validUntil: '2026-09-13',
        items: []
      }
      expect(quoteSchema.safeParse(emptyItems).success).toBe(false)
    })
  })
})
