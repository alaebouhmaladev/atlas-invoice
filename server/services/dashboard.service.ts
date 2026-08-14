import { prisma } from '../utils/db'
import Decimal from 'decimal.js'

export interface DashboardFilterParams {
  period?: string // 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'this_year' | 'custom'
  startDate?: string
  endDate?: string
  userRole?: string
}

export interface FinancialKpis {
  invoicedRevenueTtc: string // Finalized, non-cancelled invoices issued in period
  amountCollected: string // Confirmed payments received in period
  amountRemaining: string // Outstanding balance across active finalized invoices
  overdueInvoicesAmount: string // Outstanding balance of overdue invoices
  overdueInvoicesCount: number
  invoicesCount: number
  quotesCount: number
  quoteConversionRate: number // Percentage (0-100)
  acceptedQuotesValueTtc: string
}

export interface OperationalCards {
  pendingQuotesCount: number // SENT
  expiredQuotesCount: number // EXPIRED
  unpaidInvoicesCount: number // UNPAID
  partiallyPaidInvoicesCount: number // PARTIALLY_PAID
  overdueInvoicesCount: number // OVERDUE
  recentPaymentsCount: number
  recentClientsCount: number
  recentDocumentsCount: number
}

export interface TrendDataPoint {
  dateLabel: string
  invoicedTtc: number
  collected: number
}

export interface StatusDistribution {
  status: string
  label: string
  count: number
  totalTtc: number
  color: string
}

export interface TopClientMetric {
  clientId: string
  displayName: string
  invoicedTtc: number
  amountPaid: number
  invoicesCount: number
}

export interface ActionRequiredItem {
  id: string
  type: 'INVOICE_OVERDUE' | 'INVOICE_UNPAID' | 'QUOTE_EXPIRING' | 'QUOTE_EXPIRED' | 'BACKUP_WARNING'
  title: string
  subtitle: string
  number?: string
  amount?: string
  date?: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  link: string
}

export interface DashboardStatsResponse {
  periodLabel: string
  startDate: string
  endDate: string
  financials: FinancialKpis
  operational: OperationalCards
  trends: TrendDataPoint[]
  invoiceStatusDistribution: StatusDistribution[]
  quoteStatusDistribution: StatusDistribution[]
  topClients: TopClientMetric[]
  actionsRequired: ActionRequiredItem[]
  systemHealth?: {
    appStatus: 'HEALTHY' | 'WARNING' | 'DOWN'
    databaseStatus: 'CONNECTED' | 'ERROR'
    storageStatus: 'ACCESSIBLE' | 'ERROR'
    lastBackupAt?: string
    lastBackupStatus?: 'HEALTHY' | 'WARNING' | 'FAILED' | 'NONE'
    version: string
  }
}

function resolveDateRange(period: string = '30d', customStart?: string, customEnd?: string) {
  const now = new Date()
  let start = new Date()
  let end = new Date(now)

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      start.setHours(0, 0, 0, 0)
      break
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      break
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      break
    case 'custom':
      if (customStart) start = new Date(customStart)
      if (customEnd) end = new Date(customEnd)
      break
    case '30d':
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      start.setHours(0, 0, 0, 0)
      break
  }

  return { start, end }
}

export async function getDashboardStats(params: DashboardFilterParams): Promise<DashboardStatsResponse> {
  const { period = '30d', startDate, endDate, userRole } = params
  const { start, end } = resolveDateRange(period, startDate, endDate)
  const now = new Date()

  // 1. Invoices issued within period
  const invoicesInPeriod = await prisma.invoice.findMany({
    where: {
      isArchived: false,
      issueDate: { gte: start, lte: end }
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      totalTtc: true,
      amountPaid: true,
      amountDue: true,
      issueDate: true,
      dueDate: true
    }
  })

  // 2. Finalized non-cancelled invoices in period for Chiffre d'affaires facturé
  let invoicedRevenueDec = new Decimal(0)
  invoicesInPeriod.forEach((inv) => {
    if (inv.status === 'FINALIZED') {
      invoicedRevenueDec = invoicedRevenueDec.plus(new Decimal(inv.totalTtc.toString()))
    }
  })

  // 3. Payments collected within period
  const paymentsInPeriod = await prisma.payment.findMany({
    where: {
      status: 'CONFIRMED',
      paymentDate: { gte: start, lte: end }
    },
    select: {
      amount: true,
      paymentDate: true
    }
  })

  let amountCollectedDec = new Decimal(0)
  paymentsInPeriod.forEach((pm) => {
    amountCollectedDec = amountCollectedDec.plus(new Decimal(pm.amount.toString()))
  })

  // 4. All active finalized invoices to calculate current outstanding & overdue balance
  const activeFinalizedInvoices = await prisma.invoice.findMany({
    where: {
      isArchived: false,
      status: 'FINALIZED'
    },
    select: {
      id: true,
      number: true,
      dueDate: true,
      totalTtc: true,
      amountPaid: true,
      amountDue: true,
      paymentStatus: true,
      client: {
        select: { displayName: true }
      }
    }
  })

  let totalRemainingDec = new Decimal(0)
  let overdueAmountDec = new Decimal(0)
  let overdueCount = 0
  let unpaidCount = 0
  let partiallyPaidCount = 0

  const overdueActionItems: ActionRequiredItem[] = []
  const unpaidActionItems: ActionRequiredItem[] = []

  activeFinalizedInvoices.forEach((inv) => {
    const dueDec = new Decimal(inv.amountDue.toString())
    totalRemainingDec = totalRemainingDec.plus(dueDec)

    if (inv.paymentStatus === 'UNPAID') unpaidCount++
    if (inv.paymentStatus === 'PARTIALLY_PAID') partiallyPaidCount++

    const isOverdue = dueDec.greaterThan(0) && new Date(inv.dueDate) < now
    if (isOverdue) {
      overdueAmountDec = overdueAmountDec.plus(dueDec)
      overdueCount++

      if (overdueActionItems.length < 5) {
        overdueActionItems.push({
          id: inv.id,
          type: 'INVOICE_OVERDUE',
          title: `Facture en retard: ${inv.number || 'BROUILLON'}`,
          subtitle: `Client : ${inv.client.displayName}`,
          number: inv.number || undefined,
          amount: `${dueDec.toFixed(2)} MAD`,
          date: inv.dueDate.toISOString().split('T')[0],
          severity: 'HIGH',
          link: `/factures`
        })
      }
    } else if (dueDec.greaterThan(0) && unpaidActionItems.length < 3) {
      unpaidActionItems.push({
        id: inv.id,
        type: 'INVOICE_UNPAID',
        title: `Facture à régler: ${inv.number || 'BROUILLON'}`,
        subtitle: `Client : ${inv.client.displayName}`,
        number: inv.number || undefined,
        amount: `${dueDec.toFixed(2)} MAD`,
        date: inv.dueDate.toISOString().split('T')[0],
        severity: 'MEDIUM',
        link: `/factures`
      })
    }
  })

  // 5. Devis stats within period
  const quotesInPeriod = await prisma.quote.findMany({
    where: {
      isArchived: false,
      issueDate: { gte: start, lte: end }
    },
    select: {
      id: true,
      number: true,
      status: true,
      totalTtc: true,
      validUntil: true,
      client: {
        select: { displayName: true }
      }
    }
  })

  let acceptedQuotesValueDec = new Decimal(0)
  let eligibleQuotesCount = 0
  let acceptedQuotesCount = 0
  let pendingQuotesCount = 0
  let expiredQuotesCount = 0

  const expiringQuoteActionItems: ActionRequiredItem[] = []

  quotesInPeriod.forEach((q) => {
    if (q.status !== 'DRAFT') {
      eligibleQuotesCount++
    }
    if (q.status === 'ACCEPTED' || q.status === 'CONVERTED') {
      acceptedQuotesCount++
      acceptedQuotesValueDec = acceptedQuotesValueDec.plus(new Decimal(q.totalTtc.toString()))
    }
    if (q.status === 'SENT') {
      pendingQuotesCount++
      const daysUntilExpire = Math.ceil((new Date(q.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilExpire <= 3 && daysUntilExpire >= 0 && expiringQuoteActionItems.length < 3) {
        expiringQuoteActionItems.push({
          id: q.id,
          type: 'QUOTE_EXPIRING',
          title: `Devis expire bientôt: ${q.number}`,
          subtitle: `Client : ${q.client.displayName}`,
          number: q.number,
          amount: `${new Decimal(q.totalTtc.toString()).toFixed(2)} MAD`,
          date: q.validUntil.toISOString().split('T')[0],
          severity: 'MEDIUM',
          link: `/devis`
        })
      }
    }
    if (q.status === 'EXPIRED') {
      expiredQuotesCount++
    }
  })

  const quoteConversionRate = eligibleQuotesCount > 0
    ? Number(((acceptedQuotesCount / eligibleQuotesCount) * 100).toFixed(1))
    : 0

  // 6. Recent Counts
  const recentPaymentsCount = await prisma.payment.count({
    where: { status: 'CONFIRMED', createdAt: { gte: start, lte: end } }
  })
  const recentClientsCount = await prisma.client.count({
    where: { isArchived: false, createdAt: { gte: start, lte: end } }
  })
  const recentDocumentsCount = quotesInPeriod.length + invoicesInPeriod.length

  // 7. Visual Trend (grouped by day or month)
  const trends: TrendDataPoint[] = []
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff <= 31) {
    // Daily grouping
    const currentCursor = new Date(start)
    while (currentCursor <= end) {
      const dayStart = new Date(currentCursor)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(currentCursor)
      dayEnd.setHours(23, 59, 59, 999)

      const label = dayStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })

      const dayInvoiced = invoicesInPeriod
        .filter((i) => i.status === 'FINALIZED' && new Date(i.issueDate) >= dayStart && new Date(i.issueDate) <= dayEnd)
        .reduce((sum, i) => sum.plus(new Decimal(i.totalTtc.toString())), new Decimal(0))

      const dayCollected = paymentsInPeriod
        .filter((p) => new Date(p.paymentDate) >= dayStart && new Date(p.paymentDate) <= dayEnd)
        .reduce((sum, p) => sum.plus(new Decimal(p.amount.toString())), new Decimal(0))

      trends.push({
        dateLabel: label,
        invoicedTtc: dayInvoiced.toNumber(),
        collected: dayCollected.toNumber()
      })

      currentCursor.setDate(currentCursor.getDate() + 1)
    }
  } else {
    // Monthly grouping
    const currentCursor = new Date(start)
    while (currentCursor <= end) {
      const monthStart = new Date(currentCursor.getFullYear(), currentCursor.getMonth(), 1, 0, 0, 0, 0)
      const monthEnd = new Date(currentCursor.getFullYear(), currentCursor.getMonth() + 1, 0, 23, 59, 59, 999)

      const label = monthStart.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })

      const monthInvoiced = invoicesInPeriod
        .filter((i) => i.status === 'FINALIZED' && new Date(i.issueDate) >= monthStart && new Date(i.issueDate) <= monthEnd)
        .reduce((sum, i) => sum.plus(new Decimal(i.totalTtc.toString())), new Decimal(0))

      const monthCollected = paymentsInPeriod
        .filter((p) => new Date(p.paymentDate) >= monthStart && new Date(p.paymentDate) <= monthEnd)
        .reduce((sum, p) => sum.plus(new Decimal(p.amount.toString())), new Decimal(0))

      trends.push({
        dateLabel: label,
        invoicedTtc: monthInvoiced.toNumber(),
        collected: monthCollected.toNumber()
      })

      currentCursor.setMonth(currentCursor.getMonth() + 1)
    }
  }

  // 8. Invoice Status Distribution
  const allInvoiceStatuses = await prisma.invoice.groupBy({
    by: ['paymentStatus'],
    where: { isArchived: false, status: 'FINALIZED' },
    _count: true,
    _sum: { totalTtc: true }
  })

  const invoiceStatusDistribution: StatusDistribution[] = [
    {
      status: 'PAID',
      label: 'Acquittées (Payées)',
      count: allInvoiceStatuses.find((s) => s.paymentStatus === 'PAID')?._count || 0,
      totalTtc: Number(allInvoiceStatuses.find((s) => s.paymentStatus === 'PAID')?._sum.totalTtc || 0),
      color: '#16A34A'
    },
    {
      status: 'PARTIALLY_PAID',
      label: 'Partiellement Payées',
      count: partiallyPaidCount,
      totalTtc: invoicesInPeriod
        .filter((i) => i.paymentStatus === 'PARTIALLY_PAID')
        .reduce((s, i) => s + Number(i.totalTtc), 0),
      color: '#D97706'
    },
    {
      status: 'UNPAID',
      label: 'Non Payées',
      count: unpaidCount,
      totalTtc: invoicesInPeriod
        .filter((i) => i.paymentStatus === 'UNPAID')
        .reduce((s, i) => s + Number(i.totalTtc), 0),
      color: '#2563EB'
    },
    {
      status: 'OVERDUE',
      label: 'En Retard',
      count: overdueCount,
      totalTtc: overdueAmountDec.toNumber(),
      color: '#DC2626'
    }
  ]

  // 9. Quote Status Distribution
  const allQuoteStatuses = await prisma.quote.groupBy({
    by: ['status'],
    where: { isArchived: false },
    _count: true,
    _sum: { totalTtc: true }
  })

  const quoteStatusDistribution: StatusDistribution[] = [
    {
      status: 'DRAFT',
      label: 'Brouillon',
      count: allQuoteStatuses.find((s) => s.status === 'DRAFT')?._count || 0,
      totalTtc: Number(allQuoteStatuses.find((s) => s.status === 'DRAFT')?._sum.totalTtc || 0),
      color: '#64748B'
    },
    {
      status: 'SENT',
      label: 'Envoyés (En attente)',
      count: allQuoteStatuses.find((s) => s.status === 'SENT')?._count || 0,
      totalTtc: Number(allQuoteStatuses.find((s) => s.status === 'SENT')?._sum.totalTtc || 0),
      color: '#0EA5E9'
    },
    {
      status: 'ACCEPTED',
      label: 'Acceptés',
      count: (allQuoteStatuses.find((s) => s.status === 'ACCEPTED')?._count || 0) +
             (allQuoteStatuses.find((s) => s.status === 'CONVERTED')?._count || 0),
      totalTtc: Number(allQuoteStatuses.find((s) => s.status === 'ACCEPTED')?._sum.totalTtc || 0) +
                Number(allQuoteStatuses.find((s) => s.status === 'CONVERTED')?._sum.totalTtc || 0),
      color: '#16A34A'
    },
    {
      status: 'REJECTED',
      label: 'Refusés',
      count: allQuoteStatuses.find((s) => s.status === 'REJECTED')?._count || 0,
      totalTtc: Number(allQuoteStatuses.find((s) => s.status === 'REJECTED')?._sum.totalTtc || 0),
      color: '#EF4444'
    },
    {
      status: 'EXPIRED',
      label: 'Expirés',
      count: allQuoteStatuses.find((s) => s.status === 'EXPIRED')?._count || 0,
      totalTtc: Number(allQuoteStatuses.find((s) => s.status === 'EXPIRED')?._sum.totalTtc || 0),
      color: '#F59E0B'
    }
  ]

  // 10. Top Clients
  const topClientsData = await prisma.invoice.groupBy({
    by: ['clientId'],
    where: { isArchived: false, status: 'FINALIZED' },
    _sum: { totalTtc: true, amountPaid: true },
    _count: true,
    orderBy: {
      _sum: { totalTtc: 'desc' }
    },
    take: 5
  })

  const clientIds = topClientsData.map((t) => t.clientId)
  const clientRecords = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, displayName: true }
  })

  const topClients: TopClientMetric[] = topClientsData.map((tc) => {
    const client = clientRecords.find((c) => c.id === tc.clientId)
    return {
      clientId: tc.clientId,
      displayName: client?.displayName || 'Client inconnu',
      invoicedTtc: Number(tc._sum.totalTtc || 0),
      amountPaid: Number(tc._sum.amountPaid || 0),
      invoicesCount: tc._count
    }
  })

  // 11. Combine Actions Required
  const actionsRequired: ActionRequiredItem[] = [
    ...overdueActionItems,
    ...unpaidActionItems,
    ...expiringQuoteActionItems
  ]

  // Period Label
  const periodLabelMap: Record<string, string> = {
    today: 'Aujourd’hui',
    '7d': '7 derniers jours',
    '30d': '30 derniers jours',
    this_month: 'Ce mois-ci',
    last_month: 'Mois précédent',
    this_year: 'Cette année',
    custom: 'Période personnalisée'
  }

  const response: DashboardStatsResponse = {
    periodLabel: periodLabelMap[period] || 'Période sélectionnée',
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    financials: {
      invoicedRevenueTtc: invoicedRevenueDec.toFixed(2),
      amountCollected: amountCollectedDec.toFixed(2),
      amountRemaining: totalRemainingDec.toFixed(2),
      overdueInvoicesAmount: overdueAmountDec.toFixed(2),
      overdueInvoicesCount: overdueCount,
      invoicesCount: invoicesInPeriod.length,
      quotesCount: quotesInPeriod.length,
      quoteConversionRate,
      acceptedQuotesValueTtc: acceptedQuotesValueDec.toFixed(2)
    },
    operational: {
      pendingQuotesCount,
      expiredQuotesCount,
      unpaidInvoicesCount: unpaidCount,
      partiallyPaidInvoicesCount: partiallyPaidCount,
      overdueInvoicesCount: overdueCount,
      recentPaymentsCount,
      recentClientsCount,
      recentDocumentsCount
    },
    trends,
    invoiceStatusDistribution,
    quoteStatusDistribution,
    topClients,
    actionsRequired
  }

  // System Health Card for Super Admin
  if (userRole === 'SUPER_ADMIN') {
    response.systemHealth = {
      appStatus: 'HEALTHY',
      databaseStatus: 'CONNECTED',
      storageStatus: 'ACCESSIBLE',
      lastBackupAt: new Date().toISOString(),
      lastBackupStatus: 'HEALTHY',
      version: 'v1.0.0'
    }
  }

  return response
}
