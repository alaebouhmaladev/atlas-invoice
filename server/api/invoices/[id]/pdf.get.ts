import { defineEventHandler, createError, setHeader } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { getInvoiceById } from '../../../services/invoice.service'
import { generateInvoicePdfBuffer } from '../../../services/invoicePdf.service'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant de facture requis' }
    })
  }

  const invoice = await getInvoiceById(id)
  if (!invoice) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Ressource introuvable',
      data: { code: 'INVOICE_NOT_FOUND', message: 'Facture introuvable' }
    })
  }

  try {
    const pdfBuffer = await generateInvoicePdfBuffer({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      paymentStatus: invoice.paymentStatus,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      clientSnapshot: invoice.clientSnapshot as any,
      companySnapshot: invoice.companySnapshot as any,
      currency: invoice.currency,
      subtotalHt: Number(invoice.subtotalHt),
      discountAmount: Number(invoice.discountAmount),
      totalNetHt: Number(invoice.totalNetHt),
      totalVat: Number(invoice.totalVat),
      totalTtc: Number(invoice.totalTtc),
      amountPaid: Number(invoice.amountPaid),
      amountDue: Number(invoice.amountDue),
      subject: invoice.subject,
      paymentTerms: invoice.paymentTerms,
      publicNotes: invoice.publicNotes,
      cancellationReason: invoice.cancellationReason,
      cancelledAt: invoice.cancelledAt,
      paidAt: invoice.paidAt,
      items: invoice.items.map((i) => ({
        position: i.position,
        title: i.title,
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPriceHt: Number(i.unitPriceHt),
        discountRate: Number(i.discountRate),
        vatRate: Number(i.vatRate),
        grossAmountHt: Number(i.grossAmountHt),
        discountAmount: Number(i.discountAmount),
        netAmountHt: Number(i.netAmountHt),
        vatAmount: Number(i.vatAmount),
        totalTtc: Number(i.totalTtc)
      })),
      payments: invoice.payments
        .filter((p) => p.status === 'CONFIRMED')
        .map((p) => ({
          paymentDate: p.paymentDate,
          method: p.method,
          reference: p.reference,
          amount: Number(p.amount)
        }))
    })

    const filename = invoice.number ? `${invoice.number}.pdf` : `Facture-Brouillon-${invoice.id.substring(0, 8)}.pdf`

    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `inline; filename="${filename}"`)
    setHeader(event, 'Content-Length', pdfBuffer.length)

    return pdfBuffer
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur interne du serveur',
      data: {
        code: 'PDF_GENERATION_FAILED',
        message: error.message || 'Erreur lors de la génération du PDF'
      }
    })
  }
})
