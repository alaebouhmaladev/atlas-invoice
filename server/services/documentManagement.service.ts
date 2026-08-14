import { Role } from '@prisma/client'
import { prisma } from '../utils/db'
import { verifyPassword } from './auth.service'
import { createAuditLog } from './audit.service'
import { createNotification } from './notification.service'

function makeError(statusCode: number, code: string, message: string) {
  const err: any = new Error(message)
  err.statusCode = statusCode
  err.data = { code, message }
  return err
}

export type DocumentType = 'INVOICE' | 'QUOTE'
export type BulkActionType = 'ARCHIVE' | 'DELETE_DRAFTS' | 'MIXED_CLEANUP' | 'RESTORE'
export type SelectionMode = 'EXPLICIT' | 'ALL_FILTERED'

export interface BulkPreviewResult {
  totalSelected: number
  permanentDeleteAllowed: number
  archiveOnly: number
  blocked: number
  blockedReasons: Array<{ id: string; number?: string | null; reason: string }>
}

export interface BulkExecutionInput {
  documentType: DocumentType
  actionType: BulkActionType
  selectionMode: SelectionMode
  explicitIds?: string[]
  filters?: any
  confirmationPhrase: string
  reason: string
  password?: string
  idempotencyKey?: string
  requestId?: string
  user: {
    id: string
    name: string
    role: Role
  }
}

export interface BulkExecutionResult {
  operationId: string
  success: boolean
  totalSelected: number
  totalArchived: number
  totalDeleted: number
  totalRestored: number
  totalBlocked: number
  results: Array<{
    id: string
    number?: string | null
    actionTaken: 'ARCHIVED' | 'DELETED' | 'RESTORED' | 'BLOCKED'
    reason?: string
  }>
}

/**
 * Verify backend Super Admin authorization. Rejects non-super-admins with 403 and audits unauthorized attempts.
 */
export async function verifySuperAdmin(user: { id: string; name: string; role: Role }, actionName: string, requestId?: string) {
  if (user.role !== Role.SUPER_ADMIN) {
    await createAuditLog({
      userId: user.id,
      actorDisplayNameSnapshot: user.name,
      actorRoleSnapshot: user.role,
      action: 'UNAUTHORIZED_BULK_ACTION_ATTEMPT',
      category: 'SECURITY',
      result: 'FAILURE',
      entityType: 'DOCUMENT_MANAGEMENT',
      metadata: { actionName },
      requestId
    }).catch(() => {})

    throw makeError(403, 'FORBIDDEN', 'Vous n’avez pas l’autorisation d’effectuer cette action.')
  }
}

/**
 * Classify a document for permitted actions
 */
export function classifyDocument(doc: any, type: DocumentType): { canDelete: boolean; canArchive: boolean; canRestore: boolean; blockReason?: string } {
  if (type === 'INVOICE') {
    if (doc.isArchived) {
      return { canDelete: false, canArchive: false, canRestore: true }
    }
    const hasOfficialNumber = Boolean(doc.number)
    const hasPayments = (doc.payments && doc.payments.length > 0) || Number(doc.amountPaid || 0) > 0
    const isDraft = doc.status === 'DRAFT'

    if (isDraft && !hasOfficialNumber && !hasPayments) {
      return { canDelete: true, canArchive: true, canRestore: false }
    }
    return {
      canDelete: false,
      canArchive: true,
      canRestore: false,
      blockReason: hasOfficialNumber ? 'Facture officielle avec numéro attribué' : 'Facture contenant des paiements ou un statut finalisé'
    }
  } else {
    // QUOTE
    if (doc.isArchived) {
      return { canDelete: false, canArchive: false, canRestore: true }
    }
    const isConverted = doc.status === 'CONVERTED' || Boolean(doc.invoice) || Boolean(doc.convertedAt)
    const isAccepted = doc.status === 'ACCEPTED'
    const isDraft = doc.status === 'DRAFT' || doc.status === 'SENT'

    if (isConverted) {
      return { canDelete: false, canArchive: true, canRestore: false, blockReason: 'Devis converti ou lié à une facture' }
    }
    if (isAccepted) {
      return { canDelete: false, canArchive: true, canRestore: false, blockReason: 'Devis accepté par le client' }
    }
    if (isDraft) {
      return { canDelete: true, canArchive: true, canRestore: false }
    }
    return { canDelete: false, canArchive: true, canRestore: false }
  }
}

/**
 * Build Prisma query filters from search options
 */
function buildQueryWhere(documentType: DocumentType, mode: SelectionMode, explicitIds?: string[], filters?: any) {
  if (mode === 'EXPLICIT') {
    const ids = (explicitIds || []).filter(Boolean)
    return { id: { in: ids.length > 0 ? ids : ['__NONE__'] } }
  }

  const where: any = {}
  if (!filters) return where

  if (filters.search) {
    const q = filters.search.trim()
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { client: { displayName: { contains: q, mode: 'insensitive' } } }
    ]
  }

  if (filters.status) {
    where.status = filters.status
  }

  if (filters.paymentStatus && documentType === 'INVOICE') {
    where.paymentStatus = filters.paymentStatus
  }

  if (filters.archivedStatus === 'ARCHIVED') {
    where.isArchived = true
  } else if (filters.archivedStatus === 'ALL') {
    // no condition
  } else {
    // ACTIVE default
    where.isArchived = false
  }

  return where
}

/**
 * Preview bulk action classification
 */
export async function previewBulkAction(
  documentType: DocumentType,
  selectionMode: SelectionMode,
  explicitIds?: string[],
  filters?: any,
  actorUser?: { id: string; name: string; role: Role }
): Promise<BulkPreviewResult> {
  if (actorUser) {
    await verifySuperAdmin(actorUser, 'PREVIEW_BULK_ACTION')
  }

  const where = buildQueryWhere(documentType, selectionMode, explicitIds, filters)

  let items: any[] = []
  if (documentType === 'INVOICE') {
    items = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        number: true,
        status: true,
        paymentStatus: true,
        amountPaid: true,
        isArchived: true,
        payments: { select: { id: true } }
      }
    })
  } else {
    items = await prisma.quote.findMany({
      where,
      select: {
        id: true,
        number: true,
        status: true,
        isArchived: true,
        convertedAt: true,
        invoice: { select: { id: true } }
      }
    })
  }

  let permanentDeleteAllowed = 0
  let archiveOnly = 0
  let blocked = 0
  const blockedReasons: Array<{ id: string; number?: string | null; reason: string }> = []

  for (const item of items) {
    const classification = classifyDocument(item, documentType)
    if (classification.canDelete) {
      permanentDeleteAllowed++
    } else if (classification.canArchive || classification.canRestore) {
      archiveOnly++
    } else {
      blocked++
      blockedReasons.push({
        id: item.id,
        number: item.number,
        reason: classification.blockReason || 'Document non modifiable'
      })
    }
  }

  return {
    totalSelected: items.length,
    permanentDeleteAllowed,
    archiveOnly,
    blocked,
    blockedReasons
  }
}

/**
 * Execute bulk operation (Archive, Delete Drafts, Mixed Cleanup, Restore)
 */
export async function executeBulkAction(input: BulkExecutionInput): Promise<BulkExecutionResult> {
  await verifySuperAdmin(input.user, `EXECUTE_BULK_${input.actionType}`, input.requestId)

  if (!input.reason || input.reason.trim().length < 10) {
    throw makeError(400, 'INVALID_REASON', 'Le motif doit comporter au moins 10 caractères.')
  }

  const expectedPhrases: Record<BulkActionType, string> = {
    ARCHIVE: 'ARCHIVER',
    DELETE_DRAFTS: 'SUPPRIMER',
    MIXED_CLEANUP: 'TRAITER',
    RESTORE: 'RESTAURER'
  }

  const phraseKeyword = expectedPhrases[input.actionType] || 'SUPPRIMER'
  if (!input.confirmationPhrase || !input.confirmationPhrase.trim().toUpperCase().includes(phraseKeyword)) {
    throw makeError(400, 'INVALID_CONFIRMATION_PHRASE', 'La phrase de confirmation ne correspond pas.')
  }

  const where = buildQueryWhere(input.documentType, input.selectionMode, input.explicitIds, input.filters)

  let targets: any[] = []
  if (input.documentType === 'INVOICE') {
    targets = await prisma.invoice.findMany({
      where,
      take: 100,
      include: {
        client: { select: { displayName: true } },
        payments: { select: { id: true } }
      }
    })
  } else {
    targets = await prisma.quote.findMany({
      where,
      take: 100,
      include: {
        client: { select: { displayName: true } },
        invoice: { select: { id: true } }
      }
    })
  }

  // Check password re-authentication if >20 total items or >5 permanent deletes requested
  const willDeleteCount = targets.filter((t) => classifyDocument(t, input.documentType).canDelete).length
  if ((targets.length > 20 || willDeleteCount > 5) && input.password) {
    const dbUser = await prisma.user.findUnique({ where: { id: input.user.id } })
    if (dbUser) {
      const isValid = await verifyPassword(dbUser.passwordHash, input.password)
      if (!isValid) {
        throw makeError(401, 'INVALID_PASSWORD', 'Mot de passe incorrect pour la ré-authentification.')
      }
    }
  }

  const operationId = `bulk_op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  let totalArchived = 0
  let totalDeleted = 0
  let totalRestored = 0
  let totalBlocked = 0

  const results: Array<{
    id: string
    number?: string | null
    actionTaken: 'ARCHIVED' | 'DELETED' | 'RESTORED' | 'BLOCKED'
    reason?: string
  }> = []

  for (const doc of targets) {
    const classification = classifyDocument(doc, input.documentType)

    try {
      if (input.actionType === 'RESTORE') {
        if (doc.isArchived) {
          if (input.documentType === 'INVOICE') {
            await prisma.invoice.update({
              where: { id: doc.id },
              data: { isArchived: false, archivedAt: null, archivedById: null, archiveReason: null }
            })
          } else {
            await prisma.quote.update({
              where: { id: doc.id },
              data: { isArchived: false, archivedAt: null, archivedById: null, archiveReason: null }
            })
          }
          totalRestored++
          results.push({ id: doc.id, number: doc.number, actionTaken: 'RESTORED' })
        } else {
          totalBlocked++
          results.push({ id: doc.id, number: doc.number, actionTaken: 'BLOCKED', reason: 'Document non archivé' })
        }
      } else if (input.actionType === 'ARCHIVE') {
        if (classification.canArchive) {
          if (input.documentType === 'INVOICE') {
            await prisma.invoice.update({
              where: { id: doc.id },
              data: { isArchived: true, archivedAt: new Date(), archivedById: input.user.id, archiveReason: input.reason }
            })
          } else {
            await prisma.quote.update({
              where: { id: doc.id },
              data: { isArchived: true, archivedAt: new Date(), archivedById: input.user.id, archiveReason: input.reason }
            })
          }
          totalArchived++
          results.push({ id: doc.id, number: doc.number, actionTaken: 'ARCHIVED' })
        } else {
          totalBlocked++
          results.push({ id: doc.id, number: doc.number, actionTaken: 'BLOCKED', reason: classification.blockReason || 'Document non archivable' })
        }
      } else {
        // DELETE_DRAFTS or MIXED_CLEANUP
        if (classification.canDelete) {
          // Delete line items and document
          if (input.documentType === 'INVOICE') {
            await prisma.invoiceItem.deleteMany({ where: { invoiceId: doc.id } })
            await prisma.invoice.delete({ where: { id: doc.id } })
          } else {
            await prisma.quoteItem.deleteMany({ where: { quoteId: doc.id } })
            await prisma.quote.delete({ where: { id: doc.id } })
          }
          totalDeleted++
          results.push({ id: doc.id, number: doc.number, actionTaken: 'DELETED' })
        } else if (classification.canArchive) {
          // Soft-archive official documents in mixed cleanup
          if (input.documentType === 'INVOICE') {
            await prisma.invoice.update({
              where: { id: doc.id },
              data: { isArchived: true, archivedAt: new Date(), archivedById: input.user.id, archiveReason: input.reason }
            })
          } else {
            await prisma.quote.update({
              where: { id: doc.id },
              data: { isArchived: true, archivedAt: new Date(), archivedById: input.user.id, archiveReason: input.reason }
            })
          }
          totalArchived++
          results.push({ id: doc.id, number: doc.number, actionTaken: 'ARCHIVED' })
        } else {
          totalBlocked++
          results.push({ id: doc.id, number: doc.number, actionTaken: 'BLOCKED', reason: classification.blockReason || 'Action non autorisée' })
        }
      }
    } catch (err: any) {
      totalBlocked++
      results.push({ id: doc.id, number: doc.number, actionTaken: 'BLOCKED', reason: err.message || 'Erreur base de données' })
    }
  }

  // Create main audit log for the operation
  let auditAction = 'BULK_DOCUMENT_ARCHIVE'
  if (input.actionType === 'DELETE_DRAFTS') auditAction = 'BULK_DRAFT_DELETE'
  if (input.actionType === 'MIXED_CLEANUP') auditAction = 'BULK_MIXED_CLEANUP'
  if (input.actionType === 'RESTORE') auditAction = 'BULK_DOCUMENT_RESTORE'

  await createAuditLog({
    userId: input.user.id,
    actorDisplayNameSnapshot: input.user.name,
    actorRoleSnapshot: input.user.role,
    action: auditAction,
    category: 'BUSINESS',
    result: totalBlocked > 0 && totalArchived === 0 && totalDeleted === 0 && totalRestored === 0 ? 'FAILURE' : 'SUCCESS',
    entityType: input.documentType,
    metadata: {
      operationId,
      documentType: input.documentType,
      selectionMode: input.selectionMode,
      filters: input.filters,
      totalSelected: targets.length,
      totalArchived,
      totalDeleted,
      totalRestored,
      totalBlocked,
      reason: input.reason,
      affectedDocuments: results
    },
    requestId: input.requestId
  }).catch(() => {})

  // Create persistent notification for operations > 20 items or partial/full failure
  if (targets.length > 20 || totalBlocked > 0) {
    const docLabel = input.documentType === 'INVOICE' ? 'factures' : 'devis'
    let msg = `${input.user.name} a traité ${targets.length} ${docLabel}. (${totalDeleted} supprimés, ${totalArchived} archivés, ${totalRestored} restaurés)`
    if (totalBlocked > 0) {
      msg += ` [${totalBlocked} ignorés]`
    }

    await createNotification({
      recipientRole: Role.SUPER_ADMIN,
      type: 'BULK_OPERATION',
      title: `Traitement groupé de ${docLabel}`,
      message: msg,
      severity: totalBlocked > 0 ? 'WARNING' : 'INFO',
      actionUrl: '/activites',
      deduplicationKey: `bulk_${operationId}`
    }).catch(() => {})
  }

  return {
    operationId,
    success: true,
    totalSelected: targets.length,
    totalArchived,
    totalDeleted,
    totalRestored,
    totalBlocked,
    results
  }
}
