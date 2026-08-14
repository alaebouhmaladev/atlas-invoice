import { describe, it, expect } from 'vitest'
import { invoiceSchema, paymentSchema, paymentReversalSchema, invoiceCancelSchema } from '../server/utils/validation'

describe('Invoice & Payment Zod Schemas Validation', () => {
  it('validates a correct invoice input schema', () => {
    const validData = {
      clientId: '123e4567-e89b-12d3-a456-426614174000',
      issueDate: '2026-08-15',
      dueDate: '2026-09-15',
      subject: 'Facture prestation mariage',
      items: [
        {
          title: 'Menu Dîner Prestige',
          quantity: 50,
          unit: 'Personne',
          unitPriceHt: 300,
          vatRate: 20
        }
      ]
    }

    const result = invoiceSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects invoice input without required fields or empty items', () => {
    const invalidData = {
      clientId: 'invalid-uuid',
      items: []
    }

    const result = invoiceSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('validates a valid payment input', () => {
    const validPayment = {
      amount: 15000,
      paymentDate: '2026-08-20',
      method: 'BANK_TRANSFER',
      reference: 'VIR-998811'
    }

    const result = paymentSchema.safeParse(validPayment)
    expect(result.success).toBe(true)
  })

  it('rejects negative or zero payment amounts', () => {
    const invalidPayment = {
      amount: 0,
      paymentDate: '2026-08-20',
      method: 'CASH'
    }

    const result = paymentSchema.safeParse(invalidPayment)
    expect(result.success).toBe(false)
  })

  it('requires non-empty reasons for payment reversal and invoice cancellation', () => {
    expect(paymentReversalSchema.safeParse({ reason: 'ab' }).success).toBe(false)
    expect(paymentReversalSchema.safeParse({ reason: 'Erreur de saisine bancaire' }).success).toBe(true)

    expect(invoiceCancelSchema.safeParse({ reason: '   ' }).success).toBe(false)
    expect(invoiceCancelSchema.safeParse({ reason: 'Annulation évènement client' }).success).toBe(true)
  })
})
