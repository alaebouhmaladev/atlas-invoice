import { createHash } from 'node:crypto'
import { DocumentCategory, Prisma } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import { hasHrPermission } from '../utils/hrPermissions'
import type { UserPublic } from '~/types/auth'

export interface CreateDocumentInput {
  employeeId: string
  contractId?: string | null
  category: DocumentCategory
  title: string
  description?: string
  documentNumber?: string
  issueDate?: string | null
  expirationDate?: string | null
  isRequired?: boolean
  isConfidential?: boolean
}

export interface UploadDocumentVersionInput {
  documentId: string
  originalFileName: string
  mimeType: string
  buffer: Buffer
  replacementReason?: string
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg'
}

/**
 * Validate binary file magic bytes header signature and structural safety
 */
function validateFileHeader(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false

  // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
  if (mimeType === 'application/pdf') {
    const isHeaderValid = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46
    if (!isHeaderValid) return false

    const contentStr = buffer.toString('binary')

    // Reject structurally incomplete PDF without %%EOF
    if (!contentStr.includes('%%EOF')) {
      const err: any = new Error('Fichier PDF corrompu : marqueur de fin %%EOF manquant.')
      err.statusCode = 400
      throw err
    }

    // Reject encrypted / password-protected PDFs
    if (contentStr.includes('/Encrypt')) {
      const err: any = new Error('Les fichiers PDF protégés par mot de passe ou cryptés ne sont pas autorisés.')
      err.statusCode = 400
      throw err
    }

    // Reject embedded JavaScript / Executable triggers
    if (contentStr.includes('/JavaScript') || contentStr.includes('/JS ') || contentStr.includes('/Launch')) {
      const err: any = new Error('Le fichier PDF contient des scripts JavaScript ou exécutables non autorisés.')
      err.statusCode = 400
      throw err
    }

    return true
  }

  // PNG magic bytes: 0x89 0x50 0x4E 0x47
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47
  }

  // JPEG magic bytes: 0xFF 0xD8 0xFF
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
  }

  return false
}

/**
 * Get employee documents vault
 */
export async function getDocuments(query: {
  employeeId?: string
  contractId?: string
  category?: DocumentCategory
  expiringInDays?: number
  isConfidential?: boolean
  search?: string
  page?: number
  limit?: number
}, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.EmployeeDocumentWhereInput = {
    tenantId,
    archivedAt: null
  }

  if (query.employeeId) where.employeeId = query.employeeId
  if (query.contractId) where.contractId = query.contractId
  if (query.category) where.category = query.category

  const canReadMedical = hasHrPermission(actor, 'hr.document.read_medical')
  if (!canReadMedical) {
    where.category = { not: DocumentCategory.MEDICAL }
  }

  if (query.expiringInDays !== undefined) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + query.expiringInDays)
    where.expirationDate = {
      not: null,
      lte: targetDate
    }
  }

  if (query.search?.trim()) {
    const q = query.search.trim()
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { documentNumber: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [total, documents] = await Promise.all([
    prisma.employeeDocument.count({ where }),
    prisma.employeeDocument.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, employeeNumber: true, displayName: true } },
        contract: { select: { id: true, contractNumber: true } },
        currentVersion: true,
        _count: { select: { versions: true } }
      }
    })
  ])

  return {
    data: documents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Get document by ID with version history
 */
export async function getDocumentById(id: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const document = await prisma.employeeDocument.findFirst({
    where: { id, tenantId },
    include: {
      employee: { select: { id: true, employeeNumber: true, displayName: true } },
      contract: { select: { id: true, contractNumber: true } },
      currentVersion: true,
      versions: {
        orderBy: { versionNumber: 'desc' },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } }
        }
      }
    }
  })

  if (!document) {
    const err: any = new Error('Document introuvable.')
    err.statusCode = 404
    throw err
  }

  if (document.category === DocumentCategory.MEDICAL) {
    const canReadMedical = hasHrPermission(actor, 'hr.document.read_medical')
    if (!canReadMedical) {
      const err: any = new Error('Accès interdit aux documents médicaux.')
      err.statusCode = 403
      throw err
    }
  }

  return document
}

/**
 * Create document record metadata
 */
export async function createDocumentRecord(input: CreateDocumentInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const title = input.title.trim()

  if (!title) {
    const err: any = new Error('Le titre du document est obligatoire.')
    err.statusCode = 400
    throw err
  }

  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, tenantId }
  })
  if (!employee) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  const doc = await prisma.employeeDocument.create({
    data: {
      tenantId,
      employeeId: input.employeeId,
      contractId: input.contractId || null,
      category: input.category || DocumentCategory.OTHER,
      title,
      description: input.description?.trim() || null,
      documentNumber: input.documentNumber?.trim() || null,
      issueDate: input.issueDate ? new Date(input.issueDate) : null,
      expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
      isRequired: input.isRequired ?? false,
      isConfidential: input.isConfidential ?? true,
      createdById: actor.id
    },
    include: {
      employee: { select: { id: true, employeeNumber: true, displayName: true } }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_DOCUMENT_CREATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EmployeeDocument',
    entityId: doc.id,
    entityReference: doc.title,
    metadata: { title: doc.title, category: doc.category, employeeNumber: employee.employeeNumber }
  })

  return doc
}

/**
 * Upload or replace a document version with file security validation (PDF/PNG/JPEG, Magic Bytes, SHA-256)
 */
export async function uploadDocumentVersion(input: UploadDocumentVersionInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const doc = await prisma.employeeDocument.findFirst({
    where: { id: input.documentId, tenantId },
    include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
  })

  if (!doc) {
    const err: any = new Error('Document introuvable.')
    err.statusCode = 404
    throw err
  }

  // Validate MIME type
  const normalizedMime = input.mimeType.toLowerCase()
  if (!ALLOWED_MIME_TYPES[normalizedMime]) {
    const err: any = new Error('Format de fichier non autorisé. Formats acceptés : PDF, PNG, JPEG.')
    err.statusCode = 400
    throw err
  }

  // Validate File size (Max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024
  if (input.buffer.length > MAX_SIZE) {
    const err: any = new Error('La taille du fichier dépasse la limite maximale autorisée de 10 Mo.')
    err.statusCode = 400
    throw err
  }

  // Validate Magic Bytes
  if (!validateFileHeader(input.buffer, normalizedMime)) {
    const err: any = new Error('Signature binaire du fichier invalide ou corrompue.')
    err.statusCode = 400
    throw err
  }

  // Compute SHA-256 hash
  const sha256 = createHash('sha256').update(input.buffer).digest('hex')

  // Save asset in CompanyAsset (canonical bytea source)
  const asset = await prisma.companyAsset.create({
    data: {
      type: 'LOGO', // General asset store
      originalName: input.originalFileName,
      mimeType: normalizedMime,
      size: input.buffer.length,
      sha256,
      data: new Uint8Array(input.buffer),
      isActive: true,
      uploadedById: actor.id
    }
  })

  // Save copy to disk cache
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const uploadsDir = path.join(process.cwd(), 'server', 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    const ext = ALLOWED_MIME_TYPES[normalizedMime] || 'bin'
    const filePath = path.join(uploadsDir, `${asset.id}.${ext}`)
    fs.writeFileSync(filePath, input.buffer)
  } catch (err) {
    console.warn('[HR Vault] Warning: failed writing asset disk cache:', err)
  }

  const latestVersionNumber = doc.versions.length > 0 ? doc.versions[0].versionNumber : 0
  const nextVersionNumber = latestVersionNumber + 1

  const cleanOriginalName = input.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const safeDisplayName = `${doc.title}_v${nextVersionNumber}.${ALLOWED_MIME_TYPES[normalizedMime]}`

  // Create immutable EmployeeDocumentVersion
  const newVersion = await prisma.$transaction(async (tx) => {
    const versionRecord = await tx.employeeDocumentVersion.create({
      data: {
        tenantId,
        documentId: doc.id,
        versionNumber: nextVersionNumber,
        assetId: asset.id,
        originalFileName: cleanOriginalName,
        safeDisplayName,
        mimeType: normalizedMime,
        fileSize: input.buffer.length,
        sha256,
        replacementReason: input.replacementReason?.trim() || null,
        uploadedById: actor.id
      }
    })

    // Update document currentVersionId
    await tx.employeeDocument.update({
      where: { id: doc.id },
      data: {
        currentVersionId: versionRecord.id,
        version: doc.version + 1,
        updatedById: actor.id
      }
    })

    return versionRecord
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_DOCUMENT_VERSION_UPLOADED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EmployeeDocumentVersion',
    entityId: newVersion.id,
    entityReference: safeDisplayName,
    metadata: {
      documentId: doc.id,
      versionNumber: newVersion.versionNumber,
      sha256: newVersion.sha256,
      fileSize: newVersion.fileSize
    }
  })

  return newVersion
}

/**
 * Get secure file buffer for document preview/download
 */
export async function getDocumentVersionBuffer(versionId: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const docVersion = await prisma.employeeDocumentVersion.findFirst({
    where: { id: versionId, tenantId },
    include: {
      document: true,
      asset: true
    }
  })

  if (!docVersion) {
    const err: any = new Error('Version du document introuvable.')
    err.statusCode = 404
    throw err
  }

  // Check Medical permission
  if (docVersion.document.category === DocumentCategory.MEDICAL) {
    const canReadMedical = hasHrPermission(actor, 'hr.document.read_medical')
    if (!canReadMedical) {
      const err: any = new Error('Accès interdit aux documents médicaux.')
      err.statusCode = 403
      throw err
    }
  }

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_DOCUMENT_DOWNLOADED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EmployeeDocumentVersion',
    entityId: docVersion.id,
    entityReference: docVersion.safeDisplayName,
    metadata: { documentId: docVersion.documentId, versionNumber: docVersion.versionNumber }
  })

  return {
    buffer: Buffer.from(docVersion.asset.data),
    mimeType: docVersion.mimeType,
    fileName: docVersion.safeDisplayName
  }
}
