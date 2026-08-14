import { prisma } from '../utils/db'
import { createAuditEntry, createAuditLog } from './audit.service'
import { createNotification } from './notification.service'
import type { PaymentMethod, PaymentStatus } from '@prisma/client'

export interface CreatePaymentInput {
  amount: number
  paymentDate: Date | string
  method: PaymentMethod
  reference?: string | null
  notes?: string | null
}

export async function getInvoicePayments(invoiceId: string) {
  return await prisma.payment.findMany({
    where: { invoiceId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      reversedBy: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

export async function addPayment(invoiceId: string, input: CreatePaymentInput, userId: string) {
  if (input.amount <= 0) {
    throw new Error('Le montant du paiement doit être supérieur à 0 MAD')
  }

  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true }
    })

    if (!invoice) {
      throw new Error('Facture introuvable')
    }

    if (invoice.status !== 'FINALIZED') {
      throw new Error('Les paiements ne peuvent être enregistrés que sur une facture finalisée')
    }

    // Idempotency check: Reject duplicate payment submissions within 3 seconds
    const recentDuplicate = invoice.payments.find((p) =>
      p.status === 'CONFIRMED' &&
      Number(p.amount) === input.amount &&
      p.method === input.method &&
      (Date.now() - new Date(p.createdAt).getTime()) < 3000
    )
    if (recentDuplicate) {
      const err: any = new Error('Un paiement identique est déjà en cours de traitement')
      err.statusCode = 409
      err.code = 'DUPLICATE_OPERATION'
      throw err
    }

    // Calculate current confirmed paid amount
    const confirmedPayments = invoice.payments.filter((p) => p.status === 'CONFIRMED')
    const currentPaid = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalTtc = Number(invoice.totalTtc)
    const remainingBalance = Math.max(0, totalTtc - currentPaid)

    if (input.amount > remainingBalance + 0.001) {
      throw new Error(`Le montant du paiement (${input.amount.toFixed(2)} MAD) ne peut pas dépasser le solde restant (${remainingBalance.toFixed(2)} MAD)`)
    }

    // Create payment record
    const payment = await tx.payment.create({
      data: {
        invoiceId,
        amount: input.amount,
        paymentDate: new Date(input.paymentDate),
        method: input.method,
        reference: input.reference || null,
        notes: input.notes || null,
        status: 'CONFIRMED',
        createdById: userId
      }
    })

    // Recalculate invoice totals
    const newPaidAmount = currentPaid + input.amount
    const newAmountDue = Math.max(0, totalTtc - newPaidAmount)

    let newPaymentStatus: PaymentStatus = 'UNPAID'
    let newPaidAt: Date | null = invoice.paidAt

    if (newPaidAmount >= totalTtc - 0.001) {
      newPaymentStatus = 'PAID'
      newPaidAt = new Date()
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'PARTIALLY_PAID'
      newPaidAt = null
    } else {
      newPaymentStatus = 'UNPAID'
      newPaidAt = null
    }

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newPaidAmount,
        amountDue: newAmountDue,
        paymentStatus: newPaymentStatus,
        paidAt: newPaidAt
      }
    })

    await createAuditEntry({
      userId,
      action: 'PAYMENT_CREATED',
      category: 'PAYMENT',
      result: 'SUCCESS',
      entityType: 'Payment',
      entityId: payment.id,
      entityReference: invoice.number || invoice.id,
      metadata: {
        invoiceId,
        invoiceNumber: invoice.number,
        amount: input.amount,
        method: input.method,
        newPaymentStatus
      }
    })

    await createNotification({
      recipientRole: 'SUPER_ADMIN',
      type: 'PAYMENT_RECORDED',
      severity: 'SUCCESS',
      title: 'Paiement enregistré',
      message: `Un paiement de ${input.amount.toFixed(2)} MAD a été enregistré sur la facture ${invoice.number || invoice.id}.`,
      actionUrl: `/factures/${invoice.id}`,
      entityType: 'Payment',
      entityId: payment.id
    })

    return { payment, invoice: updatedInvoice }
  })
}

export async function reversePayment(invoiceId: string, paymentId: string, reason: string, userId: string) {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Le motif d\'annulation du paiement est obligatoire')
  }

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId }
    })

    if (!payment || payment.invoiceId !== invoiceId) {
      throw new Error('Paiement introuvable')
    }

    if (payment.status === 'REVERSED') {
      throw new Error('Ce paiement a déjà été annulé')
    }

    // Mark payment reversed
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedById: userId,
        reversalReason: reason.trim()
      }
    })

    // Recalculate invoice payments
    const allPayments = await tx.payment.findMany({
      where: { invoiceId, status: 'CONFIRMED' }
    })

    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId }
    })

    if (!invoice) {
      throw new Error('Facture introuvable')
    }

    const totalTtc = Number(invoice.totalTtc)
    const newPaidAmount = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const newAmountDue = Math.max(0, totalTtc - newPaidAmount)

    let newPaymentStatus: PaymentStatus = 'UNPAID'
    let newPaidAt: Date | null = invoice.paidAt

    if (newPaidAmount >= totalTtc - 0.001) {
      newPaymentStatus = 'PAID'
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'PARTIALLY_PAID'
      newPaidAt = null
    } else {
      newPaymentStatus = 'UNPAID'
      newPaidAt = null
    }

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newPaidAmount,
        amountDue: newAmountDue,
        paymentStatus: newPaymentStatus,
        paidAt: newPaidAt
      }
    })

    await createAuditLog({
      userId,
      action: 'PAYMENT_REVERSED',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: {
        invoiceId,
        invoiceNumber: invoice.number,
        reversedAmount: Number(payment.amount),
        reason: reason.trim(),
        newPaymentStatus
      }
    })

    return { payment: updatedPayment, invoice: updatedInvoice }
  })
}
