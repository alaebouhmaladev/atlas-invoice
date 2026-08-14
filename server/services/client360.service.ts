import { prisma } from '../utils/db'

function makeError(statusCode: number, code: string, message: string) {
  const err: any = new Error(message)
  err.statusCode = statusCode
  err.data = { code, message }
  return err
}

export interface ClientSummaryResult {
  totalDevis: number
  acceptedDevis: number
  totalInvoicedTtc: number
  totalPaid: number
  amountDue: number
  overdueCount: number
}

/**
 * Real server-side financial KPI calculation for a client
 */
export async function getClientSummary(clientId: string): Promise<ClientSummaryResult> {
  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) {
    throw makeError(404, 'CLIENT_NOT_FOUND', 'Client introuvable')
  }

  // Count total non-deleted devis
  const totalDevis = await prisma.quote.count({
    where: { clientId }
  })

  // Count accepted devis
  const acceptedDevis = await prisma.quote.count({
    where: { clientId, status: 'ACCEPTED' }
  })

  // Sum finalized non-cancelled invoices totalTtc
  const finalizedInvoices = await prisma.invoice.findMany({
    where: {
      clientId,
      status: 'FINALIZED'
    },
    select: {
      id: true,
      totalTtc: true,
      amountPaid: true,
      amountDue: true,
      dueDate: true,
      paymentStatus: true
    }
  })

  const totalInvoicedTtc = finalizedInvoices.reduce((sum, inv) => sum + Number(inv.totalTtc || 0), 0)

  // Sum confirmed payments on client invoices
  const clientInvoiceIds = (
    await prisma.invoice.findMany({
      where: { clientId },
      select: { id: true }
    })
  ).map((i) => i.id)

  const confirmedPayments = await prisma.payment.findMany({
    where: {
      invoiceId: { in: clientInvoiceIds.length > 0 ? clientInvoiceIds : ['__NONE__'] },
      status: 'CONFIRMED'
    },
    select: { amount: true }
  })

  const totalPaid = confirmedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const amountDue = Math.max(0, totalInvoicedTtc - totalPaid)

  const now = new Date()
  const overdueCount = finalizedInvoices.filter(
    (inv) => inv.paymentStatus !== 'PAID' && new Date(inv.dueDate) < now
  ).length

  return {
    totalDevis,
    acceptedDevis,
    totalInvoicedTtc,
    totalPaid,
    amountDue,
    overdueCount
  }
}

/**
 * Paginated Devis list for client
 */
export async function getClientDevis(clientId: string, params: { page?: number; pageSize?: number; search?: string; status?: string; archiveStatus?: string }) {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 10))
  const skip = (page - 1) * pageSize

  const where: any = { clientId }

  if (params.archiveStatus === 'archived') {
    where.isArchived = true
  } else if (params.archiveStatus === 'all') {
    // no filter
  } else {
    where.isArchived = false
  }

  if (params.status && params.status !== 'all') {
    where.status = params.status
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim()
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [totalItems, data] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        invoice: { select: { id: true, number: true, status: true } },
        createdBy: { select: { name: true } }
      }
    })
  ])

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize) || 1
    }
  }
}

/**
 * Paginated Factures list for client
 */
export async function getClientFactures(clientId: string, params: { page?: number; pageSize?: number; search?: string; status?: string; paymentStatus?: string; archiveStatus?: string }) {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 10))
  const skip = (page - 1) * pageSize

  const where: any = { clientId }

  if (params.archiveStatus === 'archived') {
    where.isArchived = true
  } else if (params.archiveStatus === 'all') {
    // no filter
  } else {
    where.isArchived = false
  }

  if (params.status && params.status !== 'all') {
    where.status = params.status
  }

  if (params.paymentStatus && params.paymentStatus !== 'all') {
    where.paymentStatus = params.paymentStatus
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim()
    where.OR = [
      { number: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [totalItems, data] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        sourceQuote: { select: { id: true, number: true } },
        createdBy: { select: { name: true } }
      }
    })
  ])

  const now = new Date()
  const formattedData = data.map((inv) => ({
    ...inv,
    isOverdue: inv.status === 'FINALIZED' && inv.paymentStatus !== 'PAID' && new Date(inv.dueDate) < now
  }))

  return {
    data: formattedData,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize) || 1
    }
  }
}

/**
 * Paginated Payments list for client
 */
export async function getClientPayments(clientId: string, params: { page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 10))
  const skip = (page - 1) * pageSize

  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    select: { id: true }
  })
  const invoiceIds = invoices.map((i) => i.id)

  const where = {
    invoiceId: { in: invoiceIds.length > 0 ? invoiceIds : ['__NONE__'] }
  }

  const [totalItems, data] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        invoice: { select: { id: true, number: true, totalTtc: true } },
        createdBy: { select: { name: true } },
        reversedBy: { select: { name: true } }
      }
    })
  ])

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize) || 1
    }
  }
}

/**
 * Paginated Activities list for client
 */
export async function getClientActivities(clientId: string, params: { page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 10))
  const skip = (page - 1) * pageSize

  // Fetch IDs of client's quotes & invoices to include document activity
  const [quotes, invoices] = await Promise.all([
    prisma.quote.findMany({ where: { clientId }, select: { id: true, number: true } }),
    prisma.invoice.findMany({ where: { clientId }, select: { id: true, number: true } })
  ])

  const quoteIds = quotes.map((q) => q.id)
  const invoiceIds = invoices.map((i) => i.id)

  const where: any = {
    OR: [
      { entityType: 'Client', entityId: clientId },
      { entityType: 'Quote', entityId: { in: quoteIds.length > 0 ? quoteIds : ['__NONE__'] } },
      { entityType: 'Invoice', entityId: { in: invoiceIds.length > 0 ? invoiceIds : ['__NONE__'] } }
    ]
  }

  const [totalItems, data] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: { select: { name: true, role: true } }
      }
    })
  ])

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize) || 1
    }
  }
}
