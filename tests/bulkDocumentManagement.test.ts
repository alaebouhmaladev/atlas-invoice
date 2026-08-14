import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Role } from '@prisma/client'
import { prisma } from '../server/utils/db'
import {
  classifyDocument,
  previewBulkAction,
  executeBulkAction,
  verifySuperAdmin
} from '../server/services/documentManagement.service'

describe('Super Admin Document Lifecycle & Bulk Management Tests', () => {
  let superAdminUser: any
  let commercialUser: any

  beforeEach(async () => {
    // Create test Super Admin user
    superAdminUser = await prisma.user.create({
      data: {
        name: 'Super Admin Tester',
        email: `superadmin.bulk.${Date.now()}@atlasbites.ma`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuuu', // mock hash
        role: Role.SUPER_ADMIN,
        isActive: true
      }
    })

    // Create test Commercial user
    commercialUser = await prisma.user.create({
      data: {
        name: 'Commercial Tester',
        email: `commercial.bulk.${Date.now()}@atlasbites.ma`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuuu',
        role: Role.COMMERCIAL,
        isActive: true
      }
    })
  })

  afterEach(async () => {
    if (superAdminUser) {
      await prisma.user.delete({ where: { id: superAdminUser.id } }).catch(() => {})
    }
    if (commercialUser) {
      await prisma.user.delete({ where: { id: commercialUser.id } }).catch(() => {})
    }
  })

  it('should enforce Super Admin authorization and reject non-super-admins with 403', async () => {
    await expect(verifySuperAdmin(commercialUser, 'EXECUTE_BULK_ARCHIVE')).rejects.toThrow(
      'Vous n’avez pas l’autorisation d’effectuer cette action.'
    )

    // Check that a security audit record was created for unauthorized attempt
    const auditLogs = await prisma.auditLog.findMany({
      where: { action: 'UNAUTHORIZED_BULK_ACTION_ATTEMPT', userId: commercialUser.id }
    })
    expect(auditLogs.length).toBeGreaterThan(0)
    expect(auditLogs[0].result).toBe('FAILURE')
  })

  it('should classify Facture drafts as deletable and official/paid Factures as archive-only', () => {
    const draftFacture = { status: 'DRAFT', number: null, amountPaid: 0, isArchived: false, payments: [] }
    const officialFacture = { status: 'FINALIZED', number: 'FAC-2026-0099', amountPaid: 0, isArchived: false, payments: [] }
    const paidFacture = { status: 'FINALIZED', number: 'FAC-2026-0100', amountPaid: 1500, isArchived: false, payments: [{ id: 'p1' }] }

    const draftRes = classifyDocument(draftFacture, 'INVOICE')
    expect(draftRes.canDelete).toBe(true)
    expect(draftRes.canArchive).toBe(true)

    const officialRes = classifyDocument(officialFacture, 'INVOICE')
    expect(officialRes.canDelete).toBe(false)
    expect(officialRes.canArchive).toBe(true)

    const paidRes = classifyDocument(paidFacture, 'INVOICE')
    expect(paidRes.canDelete).toBe(false)
    expect(paidRes.canArchive).toBe(true)
  })

  it('should classify Devis drafts as deletable and converted/accepted Devis as archive-only', () => {
    const draftQuote = { status: 'DRAFT', isArchived: false, convertedAt: null, invoice: null }
    const convertedQuote = { status: 'CONVERTED', isArchived: false, convertedAt: new Date(), invoice: { id: 'inv1' } }

    const draftRes = classifyDocument(draftQuote, 'QUOTE')
    expect(draftRes.canDelete).toBe(true)

    const convertedRes = classifyDocument(convertedQuote, 'QUOTE')
    expect(convertedRes.canDelete).toBe(false)
    expect(convertedRes.canArchive).toBe(true)
  })

  it('should reject bulk operation execution if reason is less than 10 characters', async () => {
    await expect(
      executeBulkAction({
        documentType: 'INVOICE',
        actionType: 'ARCHIVE',
        selectionMode: 'EXPLICIT',
        explicitIds: ['dummy_id'],
        confirmationPhrase: 'ARCHIVER 1 DOCUMENTS',
        reason: 'Short',
        user: superAdminUser
      })
    ).rejects.toThrow('Le motif doit comporter au moins 10 caractères.')
  })

  it('should reject bulk operation if confirmation phrase does not match', async () => {
    await expect(
      executeBulkAction({
        documentType: 'INVOICE',
        actionType: 'DELETE_DRAFTS',
        selectionMode: 'EXPLICIT',
        explicitIds: ['dummy_id'],
        confirmationPhrase: 'WRONG PHRASE',
        reason: 'Nettoyage administratif valide',
        user: superAdminUser
      })
    ).rejects.toThrow('La phrase de confirmation ne correspond pas.')
  })

  it('should execute bulk archiving on official invoices without deleting them', async () => {
    // Create client
    const client = await prisma.client.create({
      data: {
        displayName: 'Test Bulk Client',
        type: 'COMPANY',
        companyName: 'Bulk Client SARL',
        city: 'Casablanca',
        createdById: superAdminUser.id
      }
    })

    // Create official invoice
    const invoice = await prisma.invoice.create({
      data: {
        number: `FAC-2026-TEST-${Date.now()}`,
        status: 'FINALIZED',
        paymentStatus: 'UNPAID',
        issueDate: new Date(),
        dueDate: new Date(),
        clientId: client.id,
        clientSnapshot: { displayName: 'Test Bulk Client' },
        companySnapshot: { legalName: 'Atlas Bites' },
        subtotalHt: 1000,
        totalNetHt: 1000,
        totalVat: 200,
        totalTtc: 1200,
        amountPaid: 0,
        amountDue: 1200,
        isArchived: false,
        createdById: superAdminUser.id
      }
    })

    try {
      const result = await executeBulkAction({
        documentType: 'INVOICE',
        actionType: 'ARCHIVE',
        selectionMode: 'EXPLICIT',
        explicitIds: [invoice.id],
        confirmationPhrase: 'ARCHIVER 1 DOCUMENTS',
        reason: 'Archivage de fin d’exercice financier',
        user: superAdminUser
      })

      expect(result.success).toBe(true)
      expect(result.totalArchived).toBe(1)
      expect(result.totalDeleted).toBe(0)

      // Verify invoice in DB is archived
      const dbInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } })
      expect(dbInvoice?.isArchived).toBe(true)
      expect(dbInvoice?.archivedById).toBe(superAdminUser.id)
      expect(dbInvoice?.archiveReason).toBe('Archivage de fin d’exercice financier')

      // Test Restoration
      const restoreResult = await executeBulkAction({
        documentType: 'INVOICE',
        actionType: 'RESTORE',
        selectionMode: 'EXPLICIT',
        explicitIds: [invoice.id],
        confirmationPhrase: 'RESTAURER 1 DOCUMENTS',
        reason: 'Restauration administrative',
        user: superAdminUser
      })

      expect(restoreResult.success).toBe(true)
      expect(restoreResult.totalRestored).toBe(1)

      const restoredInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } })
      expect(restoredInvoice?.isArchived).toBe(false)
      expect(restoredInvoice?.number).toBe(invoice.number) // Official number preserved!
    } finally {
      await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {})
      await prisma.client.delete({ where: { id: client.id } }).catch(() => {})
    }
  })

  it('should permanently delete eligible draft invoices while preserving audit log', async () => {
    const client = await prisma.client.create({
      data: {
        displayName: 'Draft Client',
        type: 'INDIVIDUAL',
        city: 'Rabat',
        createdById: superAdminUser.id
      }
    })

    const draftInvoice = await prisma.invoice.create({
      data: {
        number: null, // Draft without official number
        status: 'DRAFT',
        paymentStatus: 'UNPAID',
        issueDate: new Date(),
        dueDate: new Date(),
        clientId: client.id,
        clientSnapshot: { displayName: 'Draft Client' },
        companySnapshot: { legalName: 'Atlas Bites' },
        subtotalHt: 500,
        totalNetHt: 500,
        totalVat: 100,
        totalTtc: 600,
        amountPaid: 0,
        amountDue: 600,
        isArchived: false,
        createdById: superAdminUser.id
      }
    })

    try {
      const result = await executeBulkAction({
        documentType: 'INVOICE',
        actionType: 'DELETE_DRAFTS',
        selectionMode: 'EXPLICIT',
        explicitIds: [draftInvoice.id],
        confirmationPhrase: 'SUPPRIMER 1 DOCUMENTS',
        reason: 'Suppression des doublons de brouillon de test',
        user: superAdminUser
      })

      expect(result.success).toBe(true)
      expect(result.totalDeleted).toBe(1)

      // Invoice should no longer exist in DB
      const deletedInvoice = await prisma.invoice.findUnique({ where: { id: draftInvoice.id } })
      expect(deletedInvoice).toBeNull()

      // Audit Log must exist for BULK_DRAFT_DELETE
      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'BULK_DRAFT_DELETE', userId: superAdminUser.id }
      })
      expect(auditLog).not.toBeNull()
      expect(auditLog?.result).toBe('SUCCESS')
    } finally {
      await prisma.client.delete({ where: { id: client.id } }).catch(() => {})
    }
  })
})
