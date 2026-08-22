import { defineEventHandler, createError, setHeader } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { getQuoteById } from '../../../services/quote.service'
import { generateQuotePdfBuffer, type ClientSnapshotData, type QuotePdfItem } from '../../../services/pdf.service'
import { createAuditLog } from '../../../services/audit.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = event.context.params?.id

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant de devis requis' }
    })
  }

  const quote = await getQuoteById(id)
  if (!quote) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Ressource introuvable',
      data: { code: 'QUOTE_NOT_FOUND', message: 'Devis introuvable' }
    })
  }

  try {
    const pdfItems: QuotePdfItem[] = quote.items.map((item) => ({
      position: item.position,
      title: item.title,
      description: item.description,
      quantity: item.quantity.toString(),
      unit: item.unit,
      unitPriceHt: item.unitPriceHt.toString(),
      discountRate: item.discountRate.toString(),
      vatRate: item.vatRate.toString(),
      grossAmountHt: item.grossAmountHt.toString(),
      discountAmount: item.discountAmount.toString(),
      netAmountHt: item.netAmountHt.toString(),
      vatAmount: item.vatAmount.toString(),
      totalTtc: item.totalTtc.toString()
    }))

    const pdfBuffer = await generateQuotePdfBuffer({
      number: quote.number,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
      clientSnapshot: quote.clientSnapshot as unknown as ClientSnapshotData,
      currency: quote.currency,
      subtotalHt: quote.subtotalHt.toString(),
      discountAmount: quote.discountAmount.toString(),
      totalNetHt: quote.totalNetHt.toString(),
      totalVat: quote.totalVat.toString(),
      totalTtc: quote.totalTtc.toString(),
      subject: quote.subject,
      paymentTerms: quote.paymentTerms,
      publicNotes: quote.publicNotes,
      items: pdfItems
    })

    await createAuditLog({
      userId: user.id,
      action: 'QUOTE_PDF_GENERATED',
      entityType: 'Quote',
      entityId: quote.id,
      metadata: { number: quote.number }
    })

    const safeFilename = `${quote.number.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`

    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `inline; filename="${safeFilename}"`)
    setHeader(event, 'Content-Length', pdfBuffer.length)

    return pdfBuffer
  } catch (err: unknown) {
    const error = err as Error
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur interne du serveur',
      data: {
        code: 'PDF_GENERATION_FAILED',
        message: error.message || 'Échec de la génération du document PDF'
      }
    })
  }
})
