import PDFDocument from 'pdfkit'
import { formatMoney } from '../utils/calculation'
import type { ClientSnapshotData } from './pdf.service'
import type { CompanySnapshotData } from './company.service'
import type { InvoiceStatus, PaymentStatus } from '@prisma/client'

export interface InvoicePdfItem {
  position: number
  title: string
  description?: string | null
  quantity: string | number
  unit: string
  unitPriceHt: string | number
  discountRate: string | number
  vatRate: string | number
  grossAmountHt: string | number
  discountAmount: string | number
  netAmountHt: string | number
  vatAmount: string | number
  totalTtc: string | number
}

export interface PaymentPdfRecord {
  paymentDate: Date | string
  method: string
  reference?: string | null
  amount: string | number
}

export interface InvoicePdfData {
  id: string
  number?: string | null
  status: InvoiceStatus
  paymentStatus: PaymentStatus
  issueDate: Date | string
  dueDate: Date | string
  clientSnapshot: ClientSnapshotData
  companySnapshot: CompanySnapshotData
  currency?: string
  subtotalHt: string | number
  discountAmount: string | number
  totalNetHt: string | number
  totalVat: string | number
  totalTtc: string | number
  amountPaid: string | number
  amountDue: string | number
  subject?: string | null
  paymentTerms?: string | null
  publicNotes?: string | null
  cancellationReason?: string | null
  cancelledAt?: Date | string | null
  paidAt?: Date | string | null
  items: InvoicePdfItem[]
  payments?: PaymentPdfRecord[]
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'CASH':
      return 'Espèces'
    case 'BANK_TRANSFER':
      return 'Virement bancaire'
    case 'CHEQUE':
      return 'Chèque'
    case 'CARD':
      return 'Carte bancaire'
    default:
      return method || 'Autre'
  }
}

export function generateInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', (err) => reject(err))

      const amberColor = '#d97706'
      const darkColor = '#0f172a'
      const mutedColor = '#64748b'
      const borderLineColor = '#cbd5e1'
      const primaryBg = '#f8fafc'

      // Check draft reference
      const isDraft = data.status === 'DRAFT'
      const isCancelled = data.status === 'CANCELLED'
      const isPaid = data.paymentStatus === 'PAID'
      const shortRef = `Brouillon #${data.id.substring(0, 6).toUpperCase()}`
      const displayTitleNumber = isDraft ? shortRef : data.number || shortRef

      // Watermark or Banner for Draft or Cancelled
      if (isDraft) {
        doc.save()
        doc.fillColor('#f59e0b', 0.15)
        doc.rect(40, 20, 515, 20).fill('#fef3c7')
        doc.fillColor('#b45309')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('BROUILLON — NON FINALISÉ (DOCUMENT NON OFFICIEL)', 45, 25, { align: 'center' })
        doc.restore()
      } else if (isCancelled) {
        doc.save()
        doc.fillColor('#ef4444', 0.15)
        doc.rect(40, 20, 515, 20).fill('#fee2e2')
        doc.fillColor('#b91c1c')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`FACTURE ANNULÉE ${data.cancellationReason ? `— Motive: ${data.cancellationReason}` : ''}`, 45, 25, { align: 'center' })
        doc.restore()
      }

      const startY = isDraft || isCancelled ? 50 : 40

      // Company Header Block (Top Left)
      doc.fillColor(darkColor).fontSize(16).font('Helvetica-Bold').text(data.companySnapshot?.legalName || 'Atlas Bites SARL', 40, startY)
      doc.fontSize(8).font('Helvetica').fillColor(mutedColor)
      doc.text(data.companySnapshot?.tradingName || 'Service Traiteur & Restauration', 40, startY + 20)
      doc.text(`${data.companySnapshot?.address || '124 Boulevard Anfa'}, ${data.companySnapshot?.city || 'Casablanca'}`, 40, startY + 30)
      doc.text(`ICE: ${data.companySnapshot?.ice || '002987123000045'} • IF: ${data.companySnapshot?.taxId || '39482710'} • RC: ${data.companySnapshot?.rc || '192837'}`, 40, startY + 40)
      doc.text(`Tél: ${data.companySnapshot?.phone || '+212 522 99 88 77'} • Email: ${data.companySnapshot?.email || 'contact@atlasbites.ma'}`, 40, startY + 50)

      // Invoice Title & Status Header (Top Right)
      let headerTitle = 'FACTURE'
      let headerColor = darkColor
      if (isDraft) {
        headerTitle = 'BROUILLON DE FACTURE'
        headerColor = '#d97706'
      } else if (isCancelled) {
        headerTitle = 'FACTURE ANNULÉE'
        headerColor = '#dc2626'
      } else if (isPaid) {
        headerTitle = 'FACTURE ACQUITTÉE'
        headerColor = '#059669'
      }

      doc.fillColor(headerColor).fontSize(16).font('Helvetica-Bold').text(headerTitle, 320, startY, { align: 'right' })
      doc.fillColor(amberColor).fontSize(12).font('Helvetica-Bold').text(displayTitleNumber, 320, startY + 22, { align: 'right' })

      doc.fillColor(mutedColor).fontSize(8).font('Helvetica')
      doc.text(`Date de facture : ${formatPdfDate(data.issueDate)}`, 320, startY + 40, { align: 'right' })
      doc.text(`Date d'échéance : ${formatPdfDate(data.dueDate)}`, 320, startY + 50, { align: 'right' })

      // Client Snapshot Box
      const clientY = startY + 70
      doc.rect(40, clientY, 515, 65).fillAndStroke(primaryBg, borderLineColor)
      doc.fillColor(amberColor).fontSize(9).font('Helvetica-Bold').text('CLIENT', 50, clientY + 8)
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text(data.clientSnapshot?.displayName || 'Client', 50, clientY + 20)

      doc.fontSize(8).font('Helvetica').fillColor(mutedColor)
      const clientDetails: string[] = []
      if (data.clientSnapshot?.ice) clientDetails.push(`ICE: ${data.clientSnapshot.ice}`)
      if (data.clientSnapshot?.taxId) clientDetails.push(`IF: ${data.clientSnapshot.taxId}`)
      if (data.clientSnapshot?.rc) clientDetails.push(`RC: ${data.clientSnapshot.rc}`)
      if (clientDetails.length > 0) doc.text(clientDetails.join('  |  '), 50, clientY + 34)

      const addressStr = [data.clientSnapshot?.address, data.clientSnapshot?.city, data.clientSnapshot?.country || 'Maroc'].filter(Boolean).join(', ')
      if (addressStr) doc.text(addressStr, 50, clientY + 46)

      // Subject / Objet if present
      let itemsTableY = clientY + 80
      if (data.subject) {
        doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold').text(`Objet : ${data.subject}`, 40, itemsTableY)
        itemsTableY += 15
      }

      // Line Items Table Header Function
      const renderTableHeader = (y: number) => {
        doc.rect(40, y, 515, 20).fill('#0f172a')
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
        doc.text('Désignation', 45, y + 6, { width: 195 })
        doc.text('Qté', 245, y + 6, { width: 40, align: 'right' })
        doc.text('Unité', 290, y + 6, { width: 45, align: 'center' })
        doc.text('P.U. HT', 340, y + 6, { width: 65, align: 'right' })
        doc.text('TVA', 410, y + 6, { width: 45, align: 'right' })
        doc.text('Total HT', 460, y + 6, { width: 90, align: 'right' })
      }

      renderTableHeader(itemsTableY)
      let currentY = itemsTableY + 22

      // Render Service Lines
      doc.font('Helvetica').fontSize(8)
      data.items.forEach((item, index) => {
        if (currentY > 730) {
          doc.addPage()
          renderTableHeader(40)
          currentY = 62
        }

        const bg = index % 2 === 0 ? '#ffffff' : '#f8fafc'
        doc.rect(40, currentY - 3, 515, 18).fill(bg)

        doc.fillColor(darkColor)
          .text(item.title, 45, currentY, { width: 195, lineBreak: false })
          .text(String(item.quantity), 245, currentY, { width: 40, align: 'right' })
          .text(item.unit, 290, currentY, { width: 45, align: 'center' })
          .text(formatMoney(item.unitPriceHt).replace(' MAD', ''), 340, currentY, { width: 65, align: 'right' })
          .text(`${Number(item.vatRate)}%`, 410, currentY, { width: 45, align: 'right' })
          .text(formatMoney(item.netAmountHt).replace(' MAD', ''), 460, currentY, { width: 90, align: 'right' })

        currentY += 18
      })

      // Divider Line
      doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).strokeColor(borderLineColor).stroke()
      currentY += 15

      // Totals Box (Bottom Right)
      if (currentY > 640) {
        doc.addPage()
        currentY = 50
      }

      const totalsX = 350
      doc.fontSize(8).font('Helvetica')

      doc.fillColor(mutedColor).text('Sous-total HT :', totalsX, currentY)
      doc.fillColor(darkColor).text(formatMoney(data.subtotalHt), totalsX + 90, currentY, { align: 'right' })
      currentY += 14

      if (Number(data.discountAmount) > 0) {
        doc.fillColor(amberColor).text('Total Remises :', totalsX, currentY)
        doc.text(`- ${formatMoney(data.discountAmount)}`, totalsX + 90, currentY, { align: 'right' })
        currentY += 14
      }

      doc.fillColor(mutedColor).text('Total Net HT :', totalsX, currentY)
      doc.fillColor(darkColor).text(formatMoney(data.totalNetHt), totalsX + 90, currentY, { align: 'right' })
      currentY += 14

      doc.fillColor(mutedColor).text('TVA Total :', totalsX, currentY)
      doc.fillColor(darkColor).text(formatMoney(data.totalVat), totalsX + 90, currentY, { align: 'right' })
      currentY += 16

      // Total TTC Highlight Box
      doc.rect(totalsX - 10, currentY - 2, 215, 24).fill('#0f172a')
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('Total TTC :', totalsX, currentY + 4)
      doc.fillColor('#fbbf24').text(formatMoney(data.totalTtc), totalsX + 70, currentY + 4, { align: 'right' })
      currentY += 32

      // Amount Paid & Balance Due Summary Box
      doc.rect(totalsX - 10, currentY - 2, 215, 34).fill('#f1f5f9')
      doc.fillColor(mutedColor).fontSize(8).font('Helvetica').text('Montant payé :', totalsX, currentY + 4)
      doc.fillColor('#059669').font('Helvetica-Bold').text(formatMoney(data.amountPaid), totalsX + 70, currentY + 4, { align: 'right' })

      doc.fillColor(mutedColor).font('Helvetica').text('Reste à payer :', totalsX, currentY + 18)
      doc.fillColor(Number(data.amountDue) > 0 ? '#dc2626' : '#059669').font('Helvetica-Bold').text(formatMoney(data.amountDue), totalsX + 70, currentY + 18, { align: 'right' })
      currentY += 45

      // Payment History Table if Paid or Partially Paid
      if (data.payments && data.payments.length > 0) {
        if (currentY > 680) {
          doc.addPage()
          currentY = 50
        }

        doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold').text('Historique des paiements reçus', 40, currentY)
        currentY += 12

        doc.rect(40, currentY, 515, 16).fill('#e2e8f0')
        doc.fillColor(darkColor).fontSize(7).font('Helvetica-Bold')
        doc.text('Date', 45, currentY + 4, { width: 80 })
        doc.text('Moyen de paiement', 130, currentY + 4, { width: 120 })
        doc.text('Référence', 260, currentY + 4, { width: 160 })
        doc.text('Montant', 430, currentY + 4, { width: 120, align: 'right' })
        currentY += 18

        data.payments.forEach((p) => {
          doc.fillColor(darkColor).fontSize(7).font('Helvetica')
          doc.text(formatPdfDate(p.paymentDate), 45, currentY, { width: 80 })
          doc.text(getPaymentMethodLabel(p.method), 130, currentY, { width: 120 })
          doc.text(p.reference || '—', 260, currentY, { width: 160 })
          doc.text(formatMoney(p.amount), 430, currentY, { width: 120, align: 'right' })
          currentY += 14
        })
        currentY += 15
      }

      // Bank RIB & Payment Terms Footer Box
      if (currentY > 700) {
        doc.addPage()
        currentY = 50
      }

      const notesY = currentY
      doc.rect(40, notesY, 280, 75).fillAndStroke(primaryBg, borderLineColor)
      doc.fillColor(amberColor).fontSize(8).font('Helvetica-Bold').text('RÈGLEMENT BANCAIRE & CONDITIONS', 48, notesY + 6)
      doc.fillColor(darkColor).fontSize(7).font('Helvetica')
      doc.text(`Banque : ${data.companySnapshot?.bankName || 'Attijariwafa Bank'}`, 48, notesY + 18)
      doc.text(`RIB / IBAN : ${data.companySnapshot?.rib || '007 780 0001234567890123 45'}`, 48, notesY + 28)
      doc.text(`Conditions : ${data.paymentTerms || 'Règlement à réception de facture'}`, 48, notesY + 38)
      if (data.publicNotes) {
        doc.fillColor(mutedColor).text(`Note : ${data.publicNotes}`, 48, notesY + 48, { width: 260 })
      }

      // Signature & Stamp Placeholder Box (For Paid or Finalized documents)
      doc.rect(340, notesY, 215, 75).fillAndStroke('#ffffff', borderLineColor)
      doc.fillColor(mutedColor).fontSize(7).font('Helvetica-Bold').text(isPaid ? 'CACHET & SIGNATURE (ACQUITTÉ)' : 'CACHET & SIGNATURE (BON POUR ACCORD)', 350, notesY + 6, { align: 'center' })

      if (isPaid) {
        doc.fillColor('#059669').fontSize(11).font('Helvetica-Bold').text('PAYÉ / ACQUITTÉ', 350, notesY + 30, { align: 'center' })
        if (data.paidAt) {
          doc.fillColor(mutedColor).fontSize(7).font('Helvetica').text(`Reçu le ${formatPdfDate(data.paidAt)}`, 350, notesY + 46, { align: 'center' })
        }
      }

      // Add Page Numbers Footer
      const totalPages = doc.bufferedPageRange().count
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i)
        doc.fillColor(mutedColor).fontSize(7).font('Helvetica')
        doc.text(
          `Atlas Bites SARL • IF ${data.companySnapshot?.taxId || '39482710'} • ICE ${data.companySnapshot?.ice || '002987123000045'} • Document généré le ${formatPdfDate(new Date())} — Page ${i + 1} sur ${totalPages}`,
          40,
          815,
          { align: 'center', width: 515 }
        )
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

function formatPdfDate(dateInput: Date | string): string {
  const d = new Date(dateInput)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
