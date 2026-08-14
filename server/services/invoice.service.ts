import { prisma } from '../utils/db'
import { calculateQuoteFinancials } from '../utils/calculation'
import { getNextSequenceNumber } from './sequence.service'
import { createAuditEntry, createAuditLog } from './audit.service'
import { createNotification } from './notification.service'
import { getCompanySnapshot } from './company.service'
import type { InvoiceStatus, PaymentStatus, DiscountType } from '@prisma/client'

export interface InvoiceItemInput {
  position?: number
  title: string
  description?: string | null
  quantity: number
  unit: string
  unitPriceHt: number
  discountRate?: number
  vatRate?: number
}

export interface CreateInvoiceInput {
  clientId: string
  issueDate: Date | string
  dueDate: Date | string
  subject?: string | null
  paymentTerms?: string | null
  publicNotes?: string | null
  internalNotes?: string | null
  discountType?: DiscountType | null
  discountValue?: number | null
  items: InvoiceItemInput[]
}

export interface InvoiceQueryParams {
  search?: string
  clientId?: string
  status?: InvoiceStatus | 'all'
  paymentStatus?: PaymentStatus | 'all'
  overdue?: boolean
  source?: 'quote' | 'direct' | 'all'
  archiveStatus?: 'active' | 'archived' | 'all'
  issueDateFrom?: Date | string
  issueDateTo?: Date | string
  dueDateFrom?: Date | string
  dueDateTo?: Date | string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

async function buildClientSnapshot(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  })
  if (!client) {
    throw new Error('Client introuvable')
  }
  if (client.isArchived) {
    throw new Error('Impossible d\'utiliser un client archivé')
  }
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

export async function getInvoices(params: InvoiceQueryParams = {}) {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {}

  if (params.archiveStatus === 'archived') {
    where.isArchived = true
  } else if (params.archiveStatus === 'all') {
    // include archived and active
  } else {
    where.isArchived = false
  }

  if (params.status && params.status !== 'all') {
    where.status = params.status
  }

  if (params.paymentStatus && params.paymentStatus !== 'all') {
    where.paymentStatus = params.paymentStatus
  }

  if (params.clientId) {
    where.clientId = params.clientId
  }

  if (params.source === 'quote') {
    where.sourceQuoteId = { not: null }
  } else if (params.source === 'direct') {
    where.sourceQuoteId = null
  }

  const now = new Date()
  if (params.overdue) {
    where.status = 'FINALIZED'
    where.paymentStatus = { not: 'PAID' }
    where.dueDate = { lt: now }
  }

  if (params.issueDateFrom || params.issueDateTo) {
    where.issueDate = {
      ...(params.issueDateFrom ? { gte: new Date(params.issueDateFrom) } : {}),
      ...(params.issueDateTo ? { lte: new Date(params.issueDateTo) } : {})
    }
  }

  if (params.dueDateFrom || params.dueDateTo) {
    where.dueDate = {
      ...(params.dueDateFrom ? { gte: new Date(params.dueDateFrom) } : {}),
      ...(params.dueDateTo ? { lte: new Date(params.dueDateTo) } : {})
    }
  }

  if (params.search && params.search.trim().length > 0) {
    const q = params.search.trim()
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { clientSnapshot: { path: ['displayName'], string_contains: q } },
      { clientSnapshot: { path: ['ice'], string_contains: q } },
      { clientSnapshot: { path: ['taxId'], string_contains: q } }
    ]
  }

  const orderByField = params.sortBy || 'createdAt'
  const orderByOrder = params.sortOrder || 'desc'
  const orderBy = { [orderByField]: orderByOrder }

  const [totalItems, rawInvoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        client: { select: { id: true, displayName: true, email: true, phone: true } },
        sourceQuote: { select: { id: true, number: true } },
        createdBy: { select: { id: true, name: true, email: true } }
      }
    })
  ])

  const invoices = rawInvoices.map((inv) => ({
    ...inv,
    isOverdue: inv.status === 'FINALIZED' && inv.paymentStatus !== 'PAID' && new Date(inv.dueDate) < now
  }))

  return {
    data: invoices,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    }
  }
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true, email: true, phone: true } },
      sourceQuote: { select: { id: true, number: true, issueDate: true } },
      items: { orderBy: { position: 'asc' } },
      payments: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          reversedBy: { select: { id: true, name: true, email: true } }
        }
      },
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      cancelledBy: { select: { id: true, name: true, email: true } }
    }
  })

  if (!invoice) return null

  const isOverdue = invoice.status === 'FINALIZED' && invoice.paymentStatus !== 'PAID' && new Date(invoice.dueDate) < new Date()

  return {
    ...invoice,
    isOverdue
  }
}

export async function createInvoice(input: CreateInvoiceInput, userId: string) {
  const clientSnapshot = await buildClientSnapshot(input.clientId)
  const companySnapshot = getCompanySnapshot()

  const itemsInput = input.items.map((item, index) => ({
    position: index + 1,
    title: item.title,
    description: item.description || null,
    quantity: item.quantity,
    unit: item.unit,
    unitPriceHt: item.unitPriceHt,
    discountRate: item.discountRate || 0,
    vatRate: item.vatRate !== undefined ? item.vatRate : 20
  }))

  const financials = calculateQuoteFinancials(itemsInput, {
    discountType: input.discountType || null,
    discountValue: input.discountValue !== undefined && input.discountValue !== null ? Number(input.discountValue) : null
  })

  const invoice = await prisma.$transaction(async (tx) => {
    const createdInvoice = await tx.invoice.create({
      data: {
        clientId: input.clientId,
        status: 'DRAFT',
        paymentStatus: 'UNPAID',
        issueDate: new Date(input.issueDate),
        dueDate: new Date(input.dueDate),
        currency: 'MAD',
        clientSnapshot: clientSnapshot as any,
        companySnapshot: companySnapshot as any,
        discountType: input.discountType || null,
        discountValue: input.discountValue !== undefined && input.discountValue !== null ? input.discountValue : null,
        subtotalHt: financials.subtotalHt,
        discountAmount: financials.discountAmount,
        totalNetHt: financials.totalNetHt,
        totalVat: financials.totalVat,
        totalTtc: financials.totalTtc,
        amountPaid: 0,
        amountDue: financials.totalTtc,
        subject: input.subject || null,
        paymentTerms: input.paymentTerms || null,
        publicNotes: input.publicNotes || null,
        internalNotes: input.internalNotes || null,
        createdById: userId,
        items: {
          create: financials.items.map((item) => ({
            position: item.position,
            title: item.title,
            description: item.description || null,
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
        client: true
      }
    })

    return createdInvoice
  })

  await createAuditLog({
    userId,
    action: 'INVOICE_CREATED',
    entityType: 'Invoice',
    entityId: invoice.id,
    metadata: {
      clientId: invoice.clientId,
      totalTtc: Number(invoice.totalTtc)
    }
  })

  return invoice
}

export async function updateInvoice(id: string, input: Partial<CreateInvoiceInput>, userId: string) {
  const existing = await prisma.invoice.findUnique({
    where: { id }
  })

  if (!existing) {
    throw new Error('Facture introuvable')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('Seules les factures au statut Brouillon peuvent être modifiées')
  }

  const clientId = input.clientId || existing.clientId
  let clientSnapshot = existing.clientSnapshot
  if (input.clientId && input.clientId !== existing.clientId) {
    clientSnapshot = await buildClientSnapshot(input.clientId)
  }

  const existingItems = await prisma.invoiceItem.findMany({
    where: { invoiceId: id },
    orderBy: { position: 'asc' }
  })

  const rawItems = input.items
    ? input.items.map((item, index) => ({
        position: index + 1,
        title: item.title,
        description: item.description || null,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceHt: item.unitPriceHt,
        discountRate: item.discountRate || 0,
        vatRate: item.vatRate !== undefined ? item.vatRate : 20
      }))
    : existingItems.map((item) => ({
        position: item.position,
        title: item.title,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPriceHt: Number(item.unitPriceHt),
        discountRate: Number(item.discountRate),
        vatRate: Number(item.vatRate)
      }))

  const discountType = input.discountType !== undefined ? input.discountType : existing.discountType
  const discountValue = input.discountValue !== undefined ? input.discountValue : (existing.discountValue ? Number(existing.discountValue) : null)

  const financials = calculateQuoteFinancials(rawItems, {
    discountType,
    discountValue
  })

  const updated = await prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      })
    }

    return await tx.invoice.update({
      where: { id },
      data: {
        clientId,
        clientSnapshot: clientSnapshot as any,
        issueDate: input.issueDate ? new Date(input.issueDate) : existing.issueDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : existing.dueDate,
        discountType,
        discountValue: discountValue !== null ? discountValue : null,
        subtotalHt: financials.subtotalHt,
        discountAmount: financials.discountAmount,
        totalNetHt: financials.totalNetHt,
        totalVat: financials.totalVat,
        totalTtc: financials.totalTtc,
        amountDue: financials.totalTtc,
        subject: input.subject !== undefined ? input.subject : existing.subject,
        paymentTerms: input.paymentTerms !== undefined ? input.paymentTerms : existing.paymentTerms,
        publicNotes: input.publicNotes !== undefined ? input.publicNotes : existing.publicNotes,
        internalNotes: input.internalNotes !== undefined ? input.internalNotes : existing.internalNotes,
        updatedById: userId,
        ...(input.items
          ? {
              items: {
                create: financials.items.map((item) => ({
                  position: item.position,
                  title: item.title,
                  description: item.description || null,
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
            }
          : {})
      },
      include: {
        items: { orderBy: { position: 'asc' } },
        client: true
      }
    })
  })

  await createAuditLog({
    userId,
    action: 'INVOICE_UPDATED',
    entityType: 'Invoice',
    entityId: updated.id,
    metadata: { totalTtc: Number(updated.totalTtc) }
  })

  return updated
}

export async function convertQuoteToInvoice(quoteId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { items: { orderBy: { position: 'asc' } } }
    })

    if (!quote) {
      throw new Error('Devis introuvable')
    }

    if (quote.status !== 'ACCEPTED') {
      throw new Error('Seuls les devis au statut Accepté peuvent être convertis en facture')
    }

    if (quote.convertedAt || (quote.status as string) === 'CONVERTED') {
      throw new Error('Ce devis a déjà été converti en facture')
    }

    const existingInvoice = await tx.invoice.findUnique({
      where: { sourceQuoteId: quoteId }
    })
    if (existingInvoice) {
      throw new Error('Une facture existe déjà pour ce devis')
    }

    const companySnapshot = getCompanySnapshot()
    const today = new Date()
    const defaultDueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    const rawItems = quote.items.map((item) => ({
      position: item.position,
      title: item.title,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPriceHt: Number(item.unitPriceHt),
      discountRate: Number(item.discountRate),
      vatRate: Number(item.vatRate)
    }))

    const financials = calculateQuoteFinancials(rawItems, {
      discountType: quote.discountType,
      discountValue: quote.discountValue ? Number(quote.discountValue) : null
    })

    // Verify financial equality
    if (Math.abs(Number(financials.totalTtc) - Number(quote.totalTtc)) > 0.01) {
      throw new Error('Écart financier détecté entre le devis et la facture')
    }

    // Create draft invoice
    const invoice = await tx.invoice.create({
      data: {
        clientId: quote.clientId,
        sourceQuoteId: quote.id,
        status: 'DRAFT',
        paymentStatus: 'UNPAID',
        issueDate: today,
        dueDate: defaultDueDate,
        currency: quote.currency,
        clientSnapshot: quote.clientSnapshot as any,
        companySnapshot: companySnapshot as any,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        subtotalHt: financials.subtotalHt,
        discountAmount: financials.discountAmount,
        totalNetHt: financials.totalNetHt,
        totalVat: financials.totalVat,
        totalTtc: financials.totalTtc,
        amountPaid: 0,
        amountDue: financials.totalTtc,
        subject: quote.subject ? `Facture - ${quote.subject}` : `Facture (Devis ${quote.number})`,
        paymentTerms: quote.paymentTerms,
        publicNotes: quote.publicNotes,
        internalNotes: quote.internalNotes ? `Converti depuis devis ${quote.number}\n${quote.internalNotes}` : `Converti depuis devis ${quote.number}`,
        createdById: userId,
        items: {
          create: financials.items.map((item) => ({
            position: item.position,
            title: item.title,
            description: item.description || null,
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
        items: true,
        sourceQuote: true
      }
    })

    // Update Quote status -> CONVERTED
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        status: 'CONVERTED',
        convertedAt: today
      }
    })

    await createAuditLog({
      userId,
      action: 'INVOICE_CONVERTED_FROM_QUOTE',
      entityType: 'Invoice',
      entityId: invoice.id,
      metadata: {
        quoteId: quote.id,
        quoteNumber: quote.number,
        invoiceId: invoice.id
      }
    })

    return invoice
  })
}

export async function finalizeInvoice(id: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existing) {
      throw new Error('Facture introuvable')
    }

    if (existing.status !== 'DRAFT') {
      throw new Error('Seule une facture au statut Brouillon peut être finalisée')
    }

    if (!existing.items || existing.items.length === 0) {
      throw new Error('Impossible de finaliser une facture sans aucune ligne de prestation')
    }

    const companySnapshot = getCompanySnapshot()
    const { formattedNumber, sequenceNumber, sequenceYear } = await getNextSequenceNumber('INVOICE')
    const finalizedAt = new Date()

    const finalizedInvoice = await tx.invoice.update({
      where: { id },
      data: {
        number: formattedNumber,
        sequenceNumber,
        sequenceYear,
        status: 'FINALIZED',
        finalizedAt,
        companySnapshot: companySnapshot as any
      },
      include: {
        items: true,
        client: true,
        payments: true
      }
    })

    await createAuditEntry({
      userId,
      action: 'INVOICE_FINALIZED',
      category: 'FACTURE',
      result: 'SUCCESS',
      entityType: 'Invoice',
      entityId: finalizedInvoice.id,
      entityReference: formattedNumber,
      metadata: {
        number: formattedNumber,
        sequenceYear,
        sequenceNumber,
        totalTtc: Number(finalizedInvoice.totalTtc)
      }
    })

    await createNotification({
      recipientRole: 'SUPER_ADMIN',
      type: 'FACTURE_FINALIZED',
      severity: 'SUCCESS',
      title: 'Facture finalisée',
      message: `La facture ${formattedNumber} a été finalisée avec succès (Montant: ${Number(finalizedInvoice.totalTtc).toFixed(2)} MAD).`,
      actionUrl: `/factures/${finalizedInvoice.id}`,
      entityType: 'Invoice',
      entityId: finalizedInvoice.id
    })

    return finalizedInvoice
  })
}

export async function cancelInvoice(id: string, reason: string, userId: string) {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Le motif d\'annulation de la facture est obligatoire')
  }

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({
      where: { id },
      include: { payments: true }
    })

    if (!existing) {
      throw new Error('Facture introuvable')
    }

    if (existing.status !== 'FINALIZED') {
      throw new Error('Seule une facture finalisée peut être annulée')
    }

    const confirmedPayments = existing.payments.filter((p) => p.status === 'CONFIRMED')
    if (confirmedPayments.length > 0) {
      throw new Error('Impossible d\'annuler une facture avec des paiements confirmés. Veuillez d\'abord procéder à l\'annulation des paiements.')
    }

    const cancelledInvoice = await tx.invoice.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason.trim(),
        cancelledById: userId
      }
    })

    await createAuditEntry({
      userId,
      action: 'INVOICE_CANCELLED',
      category: 'FACTURE',
      result: 'SUCCESS',
      entityType: 'Invoice',
      entityId: cancelledInvoice.id,
      entityReference: existing.number || cancelledInvoice.id,
      metadata: {
        number: existing.number,
        reason: reason.trim()
      }
    })

    await createNotification({
      recipientRole: 'SUPER_ADMIN',
      type: 'FACTURE_CANCELLED',
      severity: 'WARNING',
      title: 'Facture annulée',
      message: `La facture ${existing.number || cancelledInvoice.id} a été annulée. Motif: ${reason.trim()}`,
      actionUrl: `/factures/${cancelledInvoice.id}`,
      entityType: 'Invoice',
      entityId: cancelledInvoice.id
    })

    return cancelledInvoice
  })
}

export async function archiveInvoice(id: string, userId: string) {
  const existing = await prisma.invoice.findUnique({
    where: { id }
  })

  if (!existing) {
    throw new Error('Facture introuvable')
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date()
    }
  })

  await createAuditLog({
    userId,
    action: 'INVOICE_ARCHIVED',
    entityType: 'Invoice',
    entityId: id,
    metadata: { number: existing.number }
  })

  return updated
}

export async function restoreInvoice(id: string, userId: string) {
  const existing = await prisma.invoice.findUnique({
    where: { id }
  })

  if (!existing) {
    throw new Error('Facture introuvable')
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      isArchived: false,
      archivedAt: null
    }
  })

  await createAuditLog({
    userId,
    action: 'INVOICE_RESTORED',
    entityType: 'Invoice',
    entityId: id,
    metadata: { number: existing.number }
  })

  return updated
}

export async function deleteInvoice(id: string, userId: string) {
  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true }
  })

  if (!existing) {
    throw new Error('Facture introuvable')
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('Seule une facture au statut Brouillon sans numéro officiel peut être supprimée')
  }

  if (existing.sourceQuoteId) {
    throw new Error('Impossible de supprimer un brouillon issu de la conversion d\'un devis (afin d\'éviter toute rupture d\'historique)')
  }

  const deleted = await prisma.invoice.delete({
    where: { id }
  })

  await createAuditLog({
    userId,
    action: 'INVOICE_DELETED',
    entityType: 'Invoice',
    entityId: id,
    metadata: { clientId: existing.clientId }
  })

  return deleted
}
