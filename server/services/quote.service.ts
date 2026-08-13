import type { Client, QuoteStatus, DiscountType } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditLog } from './audit.service'
import { getNextSequenceNumber } from './sequence.service'
import { calculateQuoteFinancials, type RawLineItemInput, type RawGlobalDiscountInput } from '../utils/calculation'
import type { ClientSnapshotData } from './pdf.service'

export interface CreateQuoteInput {
  clientId: string
  issueDate: string | Date
  validUntil: string | Date
  subject?: string | null
  discountType?: DiscountType | null
  discountValue?: number | string | null
  paymentTerms?: string | null
  publicNotes?: string | null
  internalNotes?: string | null
  items: RawLineItemInput[]
}

export interface UpdateQuoteInput extends Partial<CreateQuoteInput> {}

export function buildClientSnapshot(client: Client): ClientSnapshotData {
  return {
    displayName: client.displayName,
    type: client.type,
    companyName: client.companyName,
    firstName: client.firstName,
    lastName: client.lastName,
    ice: client.ice,
    taxId: client.taxId,
    rc: client.rc,
    cnss: client.cnss,
    patent: client.patent,
    email: client.email,
    phone: client.phone,
    address: client.address,
    addressLine2: client.addressLine2,
    city: client.city,
    postalCode: client.postalCode,
    country: client.country,
    contactName: client.contactName
  }
}

export async function getQuotes(params?: {
  search?: string
  clientId?: string
  status?: QuoteStatus | 'all'
  archiveStatus?: 'active' | 'archived' | 'all'
  issueDateFrom?: string
  issueDateTo?: string
  validUntilFrom?: string
  validUntilTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const page = Math.max(1, params?.page || 1)
  const pageSize = Math.min(100, Math.max(1, params?.pageSize || 20))
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}

  // Archive filter
  if (params?.archiveStatus === 'archived') {
    where.isArchived = true
  } else if (params?.archiveStatus === 'all') {
    // no filter on isArchived
  } else {
    where.isArchived = false
  }

  // Client filter
  if (params?.clientId) {
    where.clientId = params.clientId
  }

  // Status filter
  if (params?.status && params.status !== 'all') {
    where.status = params.status
  }

  // Date filters
  if (params?.issueDateFrom || params?.issueDateTo) {
    where.issueDate = {
      ...(params.issueDateFrom ? { gte: new Date(params.issueDateFrom) } : {}),
      ...(params.issueDateTo ? { lte: new Date(params.issueDateTo) } : {})
    }
  }

  if (params?.validUntilFrom || params?.validUntilTo) {
    where.validUntil = {
      ...(params.validUntilFrom ? { gte: new Date(params.validUntilFrom) } : {}),
      ...(params.validUntilTo ? { lte: new Date(params.validUntilTo) } : {})
    }
  }

  // Search filter across number, subject, client display name, ICE, IF
  if (params?.search && params.search.trim()) {
    const q = params.search.trim()
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { clientSnapshot: { path: ['displayName'], string_contains: q } },
      { clientSnapshot: { path: ['ice'], string_contains: q } },
      { clientSnapshot: { path: ['taxId'], string_contains: q } }
    ]
  }

  const sortBy = params?.sortBy || 'createdAt'
  const sortOrder = params?.sortOrder || 'desc'

  const [data, totalItems] = await Promise.all([
    prisma.quote.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        client: { select: { id: true, displayName: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } }
      }
    }),
    prisma.quote.count({ where })
  ])

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    }
  }
}

export async function getQuoteById(id: string) {
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: 'asc' } },
      client: true,
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } }
    }
  })
  return quote
}

export async function createQuote(input: CreateQuoteInput, userId: string, ipAddress?: string, userAgent?: string) {
  // Validate active client
  const client = await prisma.client.findUnique({ where: { id: input.clientId } })
  if (!client) {
    throw new Error('Client introuvable.')
  }
  if (client.isArchived) {
    throw new Error('Impossible de créer un devis pour un client archivé.')
  }

  const clientSnapshot = buildClientSnapshot(client)

  // Calculate exact financials
  const discountInput: RawGlobalDiscountInput = {
    discountType: input.discountType || null,
    discountValue: input.discountValue || null
  }
  const calc = calculateQuoteFinancials(input.items, discountInput)

  // Generate sequence number inside database transaction
  const seq = await getNextSequenceNumber('QUOTE')

  const issueDate = new Date(input.issueDate)
  const validUntil = new Date(input.validUntil)

  if (validUntil < issueDate) {
    throw new Error('La date de validité ne peut pas être antérieure à la date d\'émission.')
  }

  const quote = await prisma.$transaction(async (tx) => {
    const q = await tx.quote.create({
      data: {
        number: seq.formattedNumber,
        sequenceNumber: seq.sequenceNumber,
        sequenceYear: seq.sequenceYear,
        clientId: client.id,
        clientSnapshot: clientSnapshot as unknown as object,
        status: 'DRAFT',
        issueDate,
        validUntil,
        currency: 'MAD',
        discountType: input.discountType || null,
        discountValue: input.discountValue ? String(input.discountValue) : null,
        subtotalHt: calc.subtotalHt,
        discountAmount: calc.discountAmount,
        totalNetHt: calc.totalNetHt,
        totalVat: calc.totalVat,
        totalTtc: calc.totalTtc,
        subject: input.subject || null,
        paymentTerms: input.paymentTerms || null,
        publicNotes: input.publicNotes || null,
        internalNotes: input.internalNotes || null,
        createdById: userId,
        items: {
          create: calc.items.map((item) => ({
            position: item.position,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceHt: item.unitPriceHt,
            discountRate: item.discountRate,
            vatRate: item.vatRate,
            grossAmountHt: item.grossAmountHt,
            discountAmount: item.discountAmount,
            netAmountHt: item.netAmountHt,
            vatAmount: item.vatAmount,
            totalTtc: item.totalTtc
          }))
        }
      },
      include: {
        items: { orderBy: { position: 'asc' } },
        client: true,
        createdBy: { select: { id: true, name: true, email: true } }
      }
    })

    return q
  })

  await createAuditLog({
    userId,
    action: 'QUOTE_CREATED',
    entityType: 'Quote',
    entityId: quote.id,
    metadata: {
      number: quote.number,
      clientId: quote.clientId,
      totalTtc: quote.totalTtc.toString()
    },
    ipAddress,
    userAgent
  })

  return quote
}

export async function updateQuote(id: string, input: UpdateQuoteInput, userId: string, ipAddress?: string, userAgent?: string) {
  const existing = await prisma.quote.findUnique({
    where: { id },
    include: { items: true }
  })

  if (!existing) {
    throw new Error('Devis introuvable.')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error(`Seuls les devis en statut Brouillon peuvent être modifiés. Statut actuel: ${existing.status}`)
  }

  const clientId = input.clientId || existing.clientId
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) {
    throw new Error('Client introuvable.')
  }
  if (client.isArchived) {
    throw new Error('Impossible de rattacher un client archivé.')
  }

  const clientSnapshot = buildClientSnapshot(client)
  const itemsInput = input.items || existing.items.map(i => ({
    position: i.position,
    title: i.title,
    description: i.description,
    quantity: i.quantity.toString(),
    unit: i.unit,
    unitPriceHt: i.unitPriceHt.toString(),
    discountRate: i.discountRate.toString(),
    vatRate: i.vatRate.toString()
  }))

  const discountInput: RawGlobalDiscountInput = {
    discountType: input.discountType !== undefined ? input.discountType : existing.discountType,
    discountValue: input.discountValue !== undefined ? input.discountValue : (existing.discountValue ? existing.discountValue.toString() : null)
  }

  const calc = calculateQuoteFinancials(itemsInput, discountInput)

  const issueDate = input.issueDate ? new Date(input.issueDate) : existing.issueDate
  const validUntil = input.validUntil ? new Date(input.validUntil) : existing.validUntil

  if (validUntil < issueDate) {
    throw new Error('La date de validité ne peut pas être antérieure à la date d\'émission.')
  }

  const updatedQuote = await prisma.$transaction(async (tx) => {
    // Delete existing items and recreate updated items
    await tx.quoteItem.deleteMany({ where: { quoteId: id } })

    const q = await tx.quote.update({
      where: { id },
      data: {
        clientId: client.id,
        clientSnapshot: clientSnapshot as unknown as object,
        issueDate,
        validUntil,
        discountType: discountInput.discountType || null,
        discountValue: discountInput.discountValue ? String(discountInput.discountValue) : null,
        subtotalHt: calc.subtotalHt,
        discountAmount: calc.discountAmount,
        totalNetHt: calc.totalNetHt,
        totalVat: calc.totalVat,
        totalTtc: calc.totalTtc,
        subject: input.subject !== undefined ? input.subject : existing.subject,
        paymentTerms: input.paymentTerms !== undefined ? input.paymentTerms : existing.paymentTerms,
        publicNotes: input.publicNotes !== undefined ? input.publicNotes : existing.publicNotes,
        internalNotes: input.internalNotes !== undefined ? input.internalNotes : existing.internalNotes,
        updatedById: userId,
        items: {
          create: calc.items.map((item) => ({
            position: item.position,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceHt: item.unitPriceHt,
            discountRate: item.discountRate,
            vatRate: item.vatRate,
            grossAmountHt: item.grossAmountHt,
            discountAmount: item.discountAmount,
            netAmountHt: item.netAmountHt,
            vatAmount: item.vatAmount,
            totalTtc: item.totalTtc
          }))
        }
      },
      include: {
        items: { orderBy: { position: 'asc' } },
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } }
      }
    })

    return q
  })

  await createAuditLog({
    userId,
    action: 'QUOTE_UPDATED',
    entityType: 'Quote',
    entityId: id,
    metadata: {
      number: updatedQuote.number,
      totalTtc: updatedQuote.totalTtc.toString()
    },
    ipAddress,
    userAgent
  })

  return updatedQuote
}

export async function duplicateQuote(sourceId: string, userId: string, ipAddress?: string, userAgent?: string) {
  const source = await prisma.quote.findUnique({
    where: { id: sourceId },
    include: { items: { orderBy: { position: 'asc' } }, client: true }
  })

  if (!source) {
    throw new Error('Devis source introuvable.')
  }

  // Create new sequence number
  const seq = await getNextSequenceNumber('QUOTE')
  const issueDate = new Date()
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days validity

  // Re-fetch client snapshot
  const clientSnapshot = buildClientSnapshot(source.client)

  const duplicatedQuote = await prisma.$transaction(async (tx) => {
    const q = await tx.quote.create({
      data: {
        number: seq.formattedNumber,
        sequenceNumber: seq.sequenceNumber,
        sequenceYear: seq.sequenceYear,
        clientId: source.clientId,
        clientSnapshot: clientSnapshot as unknown as object,
        status: 'DRAFT',
        issueDate,
        validUntil,
        currency: source.currency,
        defaultVatRate: source.defaultVatRate,
        discountType: source.discountType,
        discountValue: source.discountValue,
        subtotalHt: source.subtotalHt,
        discountAmount: source.discountAmount,
        totalNetHt: source.totalNetHt,
        totalVat: source.totalVat,
        totalTtc: source.totalTtc,
        subject: source.subject ? `${source.subject} (Copie)` : 'Copie de devis',
        paymentTerms: source.paymentTerms,
        publicNotes: source.publicNotes,
        internalNotes: source.internalNotes,
        createdById: userId,
        items: {
          create: source.items.map((item) => ({
            position: item.position,
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPriceHt: item.unitPriceHt,
            discountRate: item.discountRate,
            vatRate: item.vatRate,
            grossAmountHt: item.grossAmountHt,
            discountAmount: item.discountAmount,
            netAmountHt: item.netAmountHt,
            vatAmount: item.vatAmount,
            totalTtc: item.totalTtc
          }))
        }
      },
      include: {
        items: { orderBy: { position: 'asc' } },
        client: true,
        createdBy: { select: { id: true, name: true, email: true } }
      }
    })

    return q
  })

  await createAuditLog({
    userId,
    action: 'QUOTE_DUPLICATED',
    entityType: 'Quote',
    entityId: duplicatedQuote.id,
    metadata: {
      newNumber: duplicatedQuote.number,
      sourceQuoteId: sourceId,
      sourceNumber: source.number
    },
    ipAddress,
    userAgent
  })

  return duplicatedQuote
}

export async function changeQuoteStatus(id: string, newStatus: QuoteStatus, userId: string, ipAddress?: string, userAgent?: string) {
  const quote = await prisma.quote.findUnique({ where: { id } })
  if (!quote) {
    throw new Error('Devis introuvable.')
  }

  const currentStatus = quote.status

  // Validate allowed status transitions
  const allowedMap: Record<QuoteStatus, QuoteStatus[]> = {
    DRAFT: ['SENT', 'ACCEPTED', 'REJECTED'],
    SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
    REJECTED: ['DRAFT'],
    ACCEPTED: [],
    EXPIRED: [],
    CONVERTED: []
  }

  const allowedNext = allowedMap[currentStatus] || []
  if (!allowedNext.includes(newStatus)) {
    throw new Error(`Transition de statut non autorisée de ${currentStatus} vers ${newStatus}.`)
  }

  const now = new Date()
  const statusDates: Record<string, Date | null> = {}

  if (newStatus === 'SENT') statusDates.sentAt = now
  else if (newStatus === 'ACCEPTED') statusDates.acceptedAt = now
  else if (newStatus === 'REJECTED') statusDates.rejectedAt = now
  else if (newStatus === 'EXPIRED') statusDates.expiredAt = now
  else if (newStatus === 'DRAFT') {
    // Reopening draft clears rejection timestamp
    statusDates.rejectedAt = null
  }

  const updatedQuote = await prisma.quote.update({
    where: { id },
    data: {
      status: newStatus,
      ...statusDates,
      updatedById: userId
    },
    include: {
      items: { orderBy: { position: 'asc' } },
      client: true,
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } }
    }
  })

  await createAuditLog({
    userId,
    action: 'QUOTE_STATUS_CHANGED',
    entityType: 'Quote',
    entityId: id,
    metadata: {
      number: quote.number,
      previousStatus: currentStatus,
      newStatus
    },
    ipAddress,
    userAgent
  })

  return updatedQuote
}

export async function archiveQuote(id: string, userId: string, ipAddress?: string, userAgent?: string) {
  const quote = await prisma.quote.findUnique({ where: { id } })
  if (!quote) {
    throw new Error('Devis introuvable.')
  }

  const archivedQuote = await prisma.quote.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      updatedById: userId
    }
  })

  await createAuditLog({
    userId,
    action: 'QUOTE_ARCHIVED',
    entityType: 'Quote',
    entityId: id,
    metadata: { number: quote.number },
    ipAddress,
    userAgent
  })

  return archivedQuote
}

export async function restoreQuote(id: string, userId: string, ipAddress?: string, userAgent?: string) {
  const quote = await prisma.quote.findUnique({ where: { id } })
  if (!quote) {
    throw new Error('Devis introuvable.')
  }

  const restoredQuote = await prisma.quote.update({
    where: { id },
    data: {
      isArchived: false,
      archivedAt: null,
      updatedById: userId
    }
  })

  await createAuditLog({
    userId,
    action: 'QUOTE_RESTORED',
    entityType: 'Quote',
    entityId: id,
    metadata: { number: quote.number },
    ipAddress,
    userAgent
  })

  return restoredQuote
}

export async function deleteQuote(id: string, userId: string, ipAddress?: string, userAgent?: string) {
  const quote = await prisma.quote.findUnique({ where: { id } })
  if (!quote) {
    throw new Error('Devis introuvable.')
  }

  if (quote.status !== 'DRAFT') {
    throw new Error(`Seuls les devis en statut Brouillon peuvent être supprimés définitivement. Statut actuel: ${quote.status}`)
  }

  await prisma.quote.delete({ where: { id } })

  await createAuditLog({
    userId,
    action: 'QUOTE_DELETED',
    entityType: 'Quote',
    entityId: id,
    metadata: { number: quote.number },
    ipAddress,
    userAgent
  })

  return true
}
