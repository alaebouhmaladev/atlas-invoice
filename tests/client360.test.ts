import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import { Role } from '@prisma/client'
import { deleteClient } from '../server/services/client.service'
import {
  getClientSummary,
  getClientDevis,
  getClientFactures,
  getClientPayments,
  getClientActivities
} from '../server/services/client360.service'

describe('Client 360° Complete Relationship & Financial KPI Tests', () => {
  let testUser: any
  let testClient: any
  let quote1: any
  let quote2: any
  let invoice1: any
  let invoice2: any
  let payment1: any

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        name: 'Super Admin 360',
        email: `admin360.${Date.now()}.${Math.random()}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.SUPER_ADMIN,
        isActive: true
      }
    })

    // Create test client
    testClient = await prisma.client.create({
      data: {
        displayName: 'Maroc Telecom Event SARL',
        type: 'COMPANY',
        companyName: 'Maroc Telecom Event SARL',
        city: 'Casablanca',
        ice: '001234567890001',
        createdById: testUser.id
      }
    })

    // Create 2 Quotes for Client (1 DRAFT, 1 ACCEPTED)
    const seqBase = Math.floor(Math.random() * 800000) + 100000

    quote1 = await prisma.quote.create({
      data: {
        number: `DEV-360-${seqBase}-1`,
        sequenceNumber: seqBase,
        sequenceYear: 2026,
        clientId: testClient.id,
        createdById: testUser.id,
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        status: 'DRAFT',
        subject: 'Service traiteur séminaire',
        subtotalHt: 10000,
        totalNetHt: 10000,
        totalVat: 2000,
        totalTtc: 12000,
        clientSnapshot: { displayName: testClient.displayName },
        companySnapshot: { name: 'Atlas Bites SARL', city: 'Casablanca' }
      }
    })

    quote2 = await prisma.quote.create({
      data: {
        number: `DEV-360-${seqBase}-2`,
        sequenceNumber: seqBase + 1,
        sequenceYear: 2026,
        clientId: testClient.id,
        createdById: testUser.id,
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        status: 'ACCEPTED',
        subject: 'Buffet de gala',
        subtotalHt: 20000,
        totalNetHt: 20000,
        totalVat: 4000,
        totalTtc: 24000,
        clientSnapshot: { displayName: testClient.displayName },
        companySnapshot: { name: 'Atlas Bites SARL', city: 'Casablanca' }
      }
    })

    // Create 2 Invoices for Client (1 FINALIZED with payment, 1 FINALIZED OVERDUE)
    const pastDueDate = new Date(Date.now() - 10 * 24 * 3600 * 1000) // 10 days ago

    invoice1 = await prisma.invoice.create({
      data: {
        number: `FAC-360-${seqBase}-1`,
        sequenceNumber: seqBase,
        sequenceYear: 2026,
        clientId: testClient.id,
        sourceQuoteId: quote2.id,
        createdById: testUser.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 3600 * 1000),
        status: 'FINALIZED',
        paymentStatus: 'PARTIALLY_PAID',
        subject: 'Buffet de gala',
        subtotalHt: 20000,
        totalNetHt: 20000,
        totalVat: 4000,
        totalTtc: 24000,
        amountPaid: 10000,
        amountDue: 14000,
        clientSnapshot: { displayName: testClient.displayName },
        companySnapshot: { name: 'Atlas Bites SARL', city: 'Casablanca' }
      }
    })

    invoice2 = await prisma.invoice.create({
      data: {
        number: `FAC-360-${seqBase}-2`,
        sequenceNumber: seqBase + 1,
        sequenceYear: 2026,
        clientId: testClient.id,
        createdById: testUser.id,
        issueDate: new Date(),
        dueDate: pastDueDate,
        status: 'FINALIZED',
        paymentStatus: 'UNPAID',
        subject: 'Cocktail de clôture',
        subtotalHt: 5000,
        totalNetHt: 5000,
        totalVat: 1000,
        totalTtc: 6000,
        amountPaid: 0,
        amountDue: 6000,
        clientSnapshot: { displayName: testClient.displayName },
        companySnapshot: { name: 'Atlas Bites SARL', city: 'Casablanca' }
      }
    })

    // Create Payment for invoice1
    payment1 = await prisma.payment.create({
      data: {
        invoiceId: invoice1.id,
        amount: 10000,
        method: 'BANK_TRANSFER',
        reference: 'VIR-998811',
        paymentDate: new Date(),
        status: 'CONFIRMED',
        createdById: testUser.id
      }
    })

    // Invoice1 is linked to quote2 via sourceQuoteId
  })

  afterEach(async () => {
    // Clean up created entities
    if (payment1?.id) await prisma.payment.deleteMany({ where: { invoiceId: { in: [invoice1.id, invoice2.id] } } })
    if (invoice1?.id || invoice2?.id) await prisma.invoice.deleteMany({ where: { clientId: testClient.id } })
    if (quote1?.id || quote2?.id) await prisma.quote.deleteMany({ where: { clientId: testClient.id } })
    if (testClient?.id) await prisma.client.deleteMany({ where: { id: testClient.id } })
    if (testUser?.id) await prisma.user.deleteMany({ where: { id: testUser.id } })
  })

  it('should calculate accurate server-side financial summary KPIs for a client', async () => {
    const summary = await getClientSummary(testClient.id)

    expect(summary.totalDevis).toBe(2)
    expect(summary.acceptedDevis).toBe(1)
    expect(summary.totalInvoicedTtc).toBe(30000) // 24000 + 6000
    expect(summary.totalPaid).toBe(10000)
    expect(summary.amountDue).toBe(20000) // 30000 - 10000
    expect(summary.overdueCount).toBe(1) // invoice2 is past due date and unpaid
  })

  it('should return paginated devis list for client with converted invoice link', async () => {
    const res = await getClientDevis(testClient.id, { page: 1, pageSize: 10 })

    expect(res.data.length).toBe(2)
    expect(res.pagination.totalItems).toBe(2)

    const acceptedQuote = res.data.find((q: any) => q.id === quote2.id)
    expect(acceptedQuote).toBeDefined()
    expect(acceptedQuote?.invoice).toBeDefined()
    expect(acceptedQuote?.invoice?.id).toBe(invoice1.id)
  })

  it('should return paginated factures list for client with overdue flags', async () => {
    const res = await getClientFactures(testClient.id, { page: 1, pageSize: 10 })

    expect(res.data.length).toBe(2)
    expect(res.pagination.totalItems).toBe(2)

    const overdueInvoice = res.data.find((i: any) => i.id === invoice2.id)
    expect(overdueInvoice).toBeDefined()
    expect(overdueInvoice?.isOverdue).toBe(true)
  })

  it('should return paginated payments for client through their invoices', async () => {
    const res = await getClientPayments(testClient.id, { page: 1, pageSize: 10 })

    expect(res.data.length).toBe(1)
    expect(res.data[0].id).toBe(payment1.id)
    expect(res.data[0].amount.toString()).toBe('10000')
    expect(res.data[0].invoice.id).toBe(invoice1.id)
  })

  it('should prevent permanent deletion of a client linked to documents and record security audit log', async () => {
    await expect(deleteClient(testClient.id, testUser.id)).rejects.toThrow(
      'Ce client est lié à des documents et ne peut pas être supprimé définitivement. Vous pouvez l’archiver.'
    )

    // Verify rejection audit log entry
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityId: testClient.id,
        action: 'CLIENT_DELETE_REJECTED'
      }
    })

    expect(auditLog).toBeDefined()
    expect(auditLog?.category).toBe('SECURITY')
    expect(auditLog?.result).toBe('FAILURE')
  })

  it('should allow permanent deletion of an unlinked client', async () => {
    const unlinkedClient = await prisma.client.create({
      data: {
        displayName: 'Unlinked Client SARL',
        type: 'COMPANY',
        createdById: testUser.id
      }
    })

    const deleted = await deleteClient(unlinkedClient.id, testUser.id)
    expect(deleted).toBeDefined()
    expect(deleted?.id).toBe(unlinkedClient.id)

    const found = await prisma.client.findUnique({ where: { id: unlinkedClient.id } })
    expect(found).toBeNull()
  })
})
