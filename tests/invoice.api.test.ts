import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { createInvoice, updateInvoice, finalizeInvoice, cancelInvoice } from '../server/services/invoice.service'
import { convertQuoteToInvoice } from '../server/services/invoice.service'
import { addPayment, reversePayment } from '../server/services/payment.service'
import { createQuote } from '../server/services/quote.service'

async function cleanupTestData() {
  try {
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: 'test.invoice@atlasbites.ma' } }
    })
    const testUserIds = testUsers.map((u) => u.id)
    if (testUserIds.length > 0) {
      await prisma.payment.deleteMany({ where: { createdById: { in: testUserIds } } })
      await prisma.invoiceItem.deleteMany({ where: { invoice: { createdById: { in: testUserIds } } } })
      await prisma.invoice.deleteMany({ where: { createdById: { in: testUserIds } } })
      await prisma.quoteItem.deleteMany({ where: { quote: { createdById: { in: testUserIds } } })
      await prisma.quote.deleteMany({ where: { createdById: { in: testUserIds } } })
      await prisma.client.deleteMany({ where: { createdById: { in: testUserIds } } })
      await prisma.auditLog.deleteMany({ where: { userId: { in: testUserIds } } })
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } })
    }
  } catch (e) {
    // ignore if DB is offline during unit testing
  }
}

describe('Invoice & Payment Services Integration Tests', () => {
  let userId: string
  let clientId: string
  let quoteId: string

  beforeAll(async () => {
    // Clean only test-created records
    await cleanupTestData()

    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test Super Admin',
        email: 'superadmin.test.invoice@atlasbites.ma',
        passwordHash: 'hashed_secret',
        role: 'SUPER_ADMIN'
      }
    })
    userId = user.id

    // Create test client
    const client = await prisma.client.create({
      data: {
        displayName: 'Atlas Events SARL',
        companyName: 'Atlas Events SARL',
        type: 'COMPANY',
        ice: '009988776655443',
        taxId: '88776655',
        email: 'contact@atlasevents.ma',
        phone: '+212 522 11 22 33',
        createdById: userId
      }
    })
    clientId = client.id

    // Create test ACCEPTED quote for conversion test
    const quote = await createQuote(
      {
        clientId,
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        subject: 'Devis Catering Gala Annuel',
        items: [
          {
            title: 'Repas assis 3 services',
            quantity: 80,
            unit: 'Personne',
            unitPriceHt: 400,
            vatRate: 20
          }
        ]
      },
      userId
    )
    quoteId = quote.id

    // Mark quote ACCEPTED
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() }
    })
  })

  afterAll(async () => {
    await cleanupTestData()
  })

  it('creates a direct draft invoice without assigning an official number', async () => {
    const invoice = await createInvoice(
      {
        clientId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subject: 'Prestation Cocktail Anniversaire',
        items: [
          {
            title: 'Buffet Cocktail 50 personnes',
            quantity: 50,
            unit: 'Personne',
            unitPriceHt: 200,
            vatRate: 20
          }
        ]
      },
      userId
    )

    expect(invoice.id).toBeDefined()
    expect(invoice.status).toBe('DRAFT')
    expect(invoice.paymentStatus).toBe('UNPAID')
    expect(invoice.number).toBeNull() // Official number generated ONLY on finalization
    expect(Number(invoice.totalTtc)).toBe(12000) // (50 * 200) * 1.2 = 12000
    expect(Number(invoice.amountDue)).toBe(12000)
    expect(Number(invoice.amountPaid)).toBe(0)
  })

  it('converts an ACCEPTED devis into a draft invoice linked 1-to-1', async () => {
    const invoice = await convertQuoteToInvoice(quoteId, userId)

    expect(invoice.id).toBeDefined()
    expect(invoice.sourceQuoteId).toBe(quoteId)
    expect(invoice.status).toBe('DRAFT')
    expect(Number(invoice.totalTtc)).toBe(38400) // (80 * 400) * 1.2 = 38400

    // Check devis status updated -> CONVERTED
    const updatedQuote = await prisma.quote.findUnique({ where: { id: quoteId } })
    expect(updatedQuote?.status).toBe('CONVERTED')
    expect(updatedQuote?.convertedAt).not.toBeNull()

    // Cannot convert devis a second time (status is no longer ACCEPTED)
    await expect(convertQuoteToInvoice(quoteId, userId)).rejects.toThrow('Seuls les devis au statut Accepté peuvent être convertis en facture')
  })

  it('finalizes a draft invoice, generating FAC-YYYY-0001 sequential number', async () => {
    const draft = await createInvoice(
      {
        clientId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subject: 'Facture à finaliser',
        items: [
          {
            title: 'Service Traiteur',
            quantity: 1,
            unit: 'Forfait',
            unitPriceHt: 10000,
            vatRate: 20
          }
        ]
      },
      userId
    )

    const finalized = await finalizeInvoice(draft.id, userId)

    expect(finalized.status).toBe('FINALIZED')
    expect(finalized.number).toMatch(/^FAC-\d{4}-\d{4}$/)
    expect(finalized.sequenceNumber).toBeGreaterThan(0)
    expect(finalized.finalizedAt).not.toBeNull()

    // Cannot update a finalized invoice
    await expect(
      updateInvoice(draft.id, { subject: 'Tentative modif' }, userId)
    ).rejects.toThrow('Brouillon')
  })

  it('records payments, recalculates amountPaid/amountDue, and prevents overpayment', async () => {
    const draft = await createInvoice(
      {
        clientId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            title: 'Prestation 10k',
            quantity: 1,
            unit: 'Forfait',
            unitPriceHt: 10000,
            vatRate: 20
          }
        ]
      },
      userId
    )
    const finalized = await finalizeInvoice(draft.id, userId)

    // Total TTC = 12,000 MAD
    // 1. Record partial payment of 5,000 MAD
    const res1 = await addPayment(
      finalized.id,
      {
        amount: 5000,
        paymentDate: new Date(),
        method: 'BANK_TRANSFER',
        reference: 'VIR-001'
      },
      userId
    )

    expect(res1.payment.status).toBe('CONFIRMED')
    expect(Number(res1.invoice.amountPaid)).toBe(5000)
    expect(Number(res1.invoice.amountDue)).toBe(7000)
    expect(res1.invoice.paymentStatus).toBe('PARTIALLY_PAID')

    // 2. Prevent overpayment (trying to pay 8,000 MAD when only 7,000 MAD is due)
    await expect(
      addPayment(
        finalized.id,
        {
          amount: 8000,
          paymentDate: new Date(),
          method: 'CASH'
        },
        userId
      )
    ).rejects.toThrow('dépasser le solde restant')

    // 3. Pay remaining 7,000 MAD -> invoice becomes fully PAID
    const res2 = await addPayment(
      finalized.id,
      {
        amount: 7000,
        paymentDate: new Date(),
        method: 'CHEQUE',
        reference: 'CHQ-5544'
      },
      userId
    )

    expect(Number(res2.invoice.amountPaid)).toBe(12000)
    expect(Number(res2.invoice.amountDue)).toBe(0)
    expect(res2.invoice.paymentStatus).toBe('PAID')
    expect(res2.invoice.paidAt).not.toBeNull()

    // 4. Reverse the 7,000 MAD payment -> returns to PARTIALLY_PAID
    const res3 = await reversePayment(finalized.id, res2.payment.id, 'Chèque rejeté banque', userId)

    expect(res3.payment.status).toBe('REVERSED')
    expect(Number(res3.invoice.amountPaid)).toBe(5000)
    expect(Number(res3.invoice.amountDue)).toBe(7000)
    expect(res3.invoice.paymentStatus).toBe('PARTIALLY_PAID')
    expect(res3.invoice.paidAt).toBeNull()
  })

  it('requires all confirmed payments to be reversed before cancelling a finalized invoice', async () => {
    const draft = await createInvoice(
      {
        clientId,
        issueDate: new Date(),
        dueDate: new Date(),
        items: [{ title: 'Service', quantity: 1, unit: 'U', unitPriceHt: 5000, vatRate: 20 }]
      },
      userId
    )
    const finalized = await finalizeInvoice(draft.id, userId)

    const payRes = await addPayment(finalized.id, { amount: 2000, paymentDate: new Date(), method: 'CASH' }, userId)

    // Attempt cancellation with active payment -> should fail
    await expect(cancelInvoice(finalized.id, 'Annulation', userId)).rejects.toThrow('paiements confirmés')

    // Reverse payment
    await reversePayment(finalized.id, payRes.payment.id, 'Erreur de caisse', userId)

    // Now cancellation succeeds
    const cancelled = await cancelInvoice(finalized.id, 'Évènement annulé par le client', userId)
    expect(cancelled.status).toBe('CANCELLED')
    expect(cancelled.cancellationReason).toBe('Évènement annulé par le client')
  })
})
