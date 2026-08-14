import PDFDocument from 'pdfkit'
import sharp from 'sharp'
import { formatMoney } from '../../utils/calculation'
import type { ClientSnapshotData } from '../pdf.service'
import type { CompanySnapshotData } from '../company.service'

export interface SharedPdfItem {
  position: number
  title: string
  description?: string | null
  quantity: string | number
  unit: string
  unitPriceHt: string | number
  discountRate?: string | number
  vatRate: string | number
  grossAmountHt: string | number
  discountAmount: string | number
  netAmountHt: string | number
  vatAmount: string | number
  totalTtc: string | number
}

export interface SharedPaymentRecord {
  paymentDate: Date | string
  method: string
  reference?: string | null
  amount: string | number
}

export interface SharedPdfDocumentData {
  type: 'QUOTE' | 'INVOICE'
  id: string
  number?: string | null
  status: string // DRAFT, SENT, ACCEPTED, REFUSED, EXPIRED, FINALIZED, CANCELLED
  paymentStatus?: string // UNPAID, PARTIALLY_PAID, PAID
  issueDate: Date | string
  validUntil?: Date | string // for Devis
  dueDate?: Date | string // for Facture
  paidAt?: Date | string | null
  cancelledAt?: Date | string | null
  cancellationReason?: string | null
  clientSnapshot: ClientSnapshotData
  companySnapshot: CompanySnapshotData
  currency?: string
  subtotalHt: string | number
  discountAmount: string | number
  totalNetHt: string | number
  totalVat: string | number
  totalTtc: string | number
  amountPaid?: string | number
  amountDue?: string | number
  subject?: string | null
  paymentTerms?: string | null
  publicNotes?: string | null
  items: SharedPdfItem[]
  payments?: SharedPaymentRecord[]
  logoBuffer?: Buffer | null
  signatureBuffer?: Buffer | null
  stampBuffer?: Buffer | null
}

function formatPdfDate(dateInput?: Date | string | null): string {
  if (!dateInput) return '—'
  return new Date(dateInput).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatAmount(val: string | number): string {
  return formatMoney(val)
}

export interface NormalizedImageResult {
  buffer: Buffer
  width: number
  height: number
}

export async function normalizePdfImage(buffer: Buffer | null | undefined): Promise<NormalizedImageResult | null> {
  if (!buffer || buffer.length === 0) return null
  try {
    let img = sharp(buffer)
    const meta = await img.metadata()
    if (!meta.width || !meta.height) return null

    // 1. Trim transparent background padding
    try {
      const trimmedTrans = await img.trim().toBuffer()
      img = sharp(trimmedTrans)
    } catch {}

    // 2. Trim white / near-white background padding
    try {
      const trimmedWhite = await img.trim({ background: '#ffffff', threshold: 25 }).toBuffer()
      img = sharp(trimmedWhite)
    } catch {}

    // 3. Add 4px transparent padding around trimmed visible mark
    const finalBuffer = await img
      .extend({
        top: 4,
        bottom: 4,
        left: 4,
        right: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer()

    const finalMeta = await sharp(finalBuffer).metadata()
    if (!finalMeta.width || !finalMeta.height) return null

    return {
      buffer: finalBuffer,
      width: finalMeta.width,
      height: finalMeta.height
    }
  } catch {
    try {
      const meta = await sharp(buffer).metadata()
      if (meta.width && meta.height) {
        return { buffer, width: meta.width, height: meta.height }
      }
    } catch {}
    return null
  }
}

export async function buildSharedPdfDocument(data: SharedPdfDocumentData): Promise<Buffer> {
  const showSigOnPaid = (data.companySnapshot as any)?.showSignatureOnPaidInvoice !== false
  const showStampOnPaid = (data.companySnapshot as any)?.showStampOnPaidInvoice !== false

  const isInvoiceType = data.type === 'INVOICE'
  const isPaidInvoice = data.paymentStatus === 'PAID'

  const normSignature = (isInvoiceType && isPaidInvoice && showSigOnPaid && data.signatureBuffer) ? await normalizePdfImage(data.signatureBuffer) : null
  const normStamp = (isInvoiceType && isPaidInvoice && showStampOnPaid && data.stampBuffer) ? await normalizePdfImage(data.stampBuffer) : null

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
        bufferPages: true
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', (err) => reject(err))

      // Color Palette matching visual reference image
      const bgCream = '#FAF9F5'
      const darkColor = '#1A1A1A'
      const textMuted = '#4A5568'
      const borderDark = '#1A1A1A'
      const greenAccent = '#15803D'
      const greenBorder = '#16A34A'
      const redAccent = '#DC2626'
      const amberAccent = '#D97706'

      const isQuote = data.type === 'QUOTE'
      const isInvoice = data.type === 'INVOICE'
      const isDraft = data.status === 'DRAFT'
      const isCancelled = data.status === 'CANCELLED'
      const isPaid = data.paymentStatus === 'PAID'
      const isPartiallyPaid = data.paymentStatus === 'PARTIALLY_PAID'

      // Document Title & Numbering
      let docTitle = isQuote ? 'DEVIS' : 'FACTURE'
      let docNumberStr = data.number ? `FACTURE N° : ${data.number}` : ''
      if (isQuote) {
        docNumberStr = data.number ? `DEVIS N° : ${data.number}` : ''
      }
      if (isInvoice && isDraft) {
        docTitle = 'BROUILLON DE FACTURE'
        docNumberStr = `BROUILLON #${data.id.substring(0, 6).toUpperCase()}`
      } else if (isQuote && isDraft && !data.number) {
        docTitle = 'BROUILLON DE DEVIS'
        docNumberStr = `BROUILLON #${data.id.substring(0, 6).toUpperCase()}`
      }

      // Check if discounts exist in any line item
      const hasLineDiscount = data.items.some((it) => Number(it.discountAmount) > 0 || Number(it.discountRate) > 0)

      // Page Canvas Setup: Draw Background & Page Border function
      const drawCanvasDecorations = () => {
        doc.save()
        // Off-white canvas fill
        doc.rect(0, 0, 595.28, 841.89).fill(bgCream)
        // Outer Thin Dark Rectangular Border
        doc.rect(14, 14, 567.28, 813.89).strokeColor(borderDark).lineWidth(0.75).stroke()
        doc.restore()
      }

      drawCanvasDecorations()

      let currentY = 32

      // 1. Draft or Cancelled Top Banner if applicable
      if (isDraft) {
        doc.save()
        doc.rect(32, 22, 531.28, 16).fill('#FEF3C7')
        doc.fillColor('#B45309').fontSize(9.5).font('Helvetica-Bold')
          .text('DOCUMENT BROUILLON — NON FINALISÉ (SANS VALEUR LÉGALE)', 32, 25, { width: 531.28, align: 'center' })
        doc.restore()
        currentY = 42
      } else if (isCancelled) {
        doc.save()
        doc.rect(32, 22, 531.28, 16).fill('#FEE2E2')
        doc.fillColor('#B91C1C').fontSize(9.5).font('Helvetica-Bold')
          .text(`DOCUMENT ANNULÉ ${data.cancellationReason ? `— Motif : ${data.cancellationReason}` : ''}`, 32, 25, { width: 531.28, align: 'center' })
        doc.restore()
        currentY = 42
      }

      // 2. Header (Logo Top-Left, Document Title & Metadata Grid Top-Right)
      const headerTop = currentY

      // Left Header: Logo image or Text Fallback
      const showLogoOnDoc = (data.companySnapshot as any)?.showLogoOnDocuments !== false
      const compName = data.companySnapshot?.legalName || 'ATLAS BITES'

      if (showLogoOnDoc && data.logoBuffer && data.logoBuffer.length > 0) {
        try {
          doc.image(data.logoBuffer, 32, headerTop, { fit: [160, 55] })
        } catch {
          doc.fillColor(darkColor).fontSize(20).font('Helvetica-Bold').text(compName, 32, headerTop)
        }
      } else {
        doc.fillColor(darkColor).fontSize(20).font('Helvetica-Bold').text(compName, 32, headerTop)
      }

      // Right Header: Document Title & Metadata Grid
      doc.fillColor(darkColor).fontSize(28).font('Helvetica-Bold').text(docTitle, 280, headerTop, { width: 283.28, align: 'right' })

      let metaY = headerTop + 32
      doc.fontSize(10)

      if (docNumberStr) {
        const parts = docNumberStr.split(' : ')
        const labelText = parts[0] + ' : '
        const valText = parts[1] || ''

        doc.font('Helvetica-Bold').fillColor(darkColor).text(labelText, 280, metaY, { width: 170, align: 'right' })
        doc.font('Helvetica').fillColor(darkColor).text(valText, 450, metaY, { width: 113.28, align: 'right' })
        metaY += 14
      }

      // Date
      doc.font('Helvetica-Bold').fillColor(darkColor).text('DATE : ', 280, metaY, { width: 170, align: 'right' })
      doc.font('Helvetica').fillColor(darkColor).text(formatPdfDate(data.issueDate), 450, metaY, { width: 113.28, align: 'right' })
      metaY += 14

      if (isQuote && data.validUntil) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('VALIDITÉ : ', 280, metaY, { width: 170, align: 'right' })
        doc.font('Helvetica').fillColor(darkColor).text(formatPdfDate(data.validUntil), 450, metaY, { width: 113.28, align: 'right' })
        metaY += 14
      }

      // Divider Line below Header (with generous margin after VALIDITÉ / DATE)
      const dividerY = Math.max(headerTop + 68, metaY + 12)
      doc.moveTo(32, dividerY).lineTo(563.28, dividerY).strokeColor(borderDark).lineWidth(0.75).stroke()
      currentY = dividerY + 22

      // 3. ÉMETTEUR and DESTINATAIRE (Two Aligned Columns)
      const colWidth = 250
      const emitterX = 32
      const recipientX = 310
      const blockTopY = currentY

      // Left Column: ÉMETTEUR
      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('ÉMETTEUR', emitterX, blockTopY)
      doc.moveTo(emitterX, blockTopY + 13).lineTo(emitterX + 50, blockTopY + 13).strokeColor(darkColor).lineWidth(1).stroke()

      doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text(compName, emitterX, blockTopY + 20)

      let eY = blockTopY + 34
      doc.fillColor(textMuted).fontSize(10).font('Helvetica')

      const tradeName = (data.companySnapshot as any)?.tradingName || (data.companySnapshot as any)?.tradeName
      if (tradeName && tradeName !== compName) {
        doc.text(tradeName, emitterX, eY, { width: colWidth })
        eY += 13
      }

      const compAddr = [data.companySnapshot?.address, (data.companySnapshot as any)?.addressLine2, data.companySnapshot?.city, data.companySnapshot?.country || 'Maroc'].filter((x): x is string => Boolean(x))
      compAddr.forEach((line) => {
        doc.text(line, emitterX, eY, { width: colWidth })
        eY += 13
      })

      if (data.companySnapshot?.phone) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('Tél. : ', emitterX, eY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.phone)
        eY += 13
      }
      if (data.companySnapshot?.email) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('Email : ', emitterX, eY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.email)
        eY += 13
      }
      if (data.companySnapshot?.ice) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('ICE : ', emitterX, eY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.ice)
        eY += 13
      }
      if (data.companySnapshot?.rc) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('RC : ', emitterX, eY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.rc)
        eY += 13
      }
      if (data.companySnapshot?.taxId) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('IF : ', emitterX, eY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.taxId)
        eY += 13
      }
      if ((data.companySnapshot as any)?.cnss) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('CNSS : ', emitterX, eY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text((data.companySnapshot as any).cnss)
        eY += 13
      }

      // Right Column: DESTINATAIRE
      const snap = data.clientSnapshot || {}
      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('DESTINATAIRE', recipientX, blockTopY)
      doc.moveTo(recipientX, blockTopY + 13).lineTo(recipientX + 70, blockTopY + 13).strokeColor(darkColor).lineWidth(1).stroke()

      doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text(snap.displayName || snap.companyName || 'Client', recipientX, blockTopY + 20)

      let rY = blockTopY + 34
      doc.fillColor(textMuted).fontSize(10).font('Helvetica')

      if (snap.contactName) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('Attn : ', recipientX, rY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(snap.contactName)
        rY += 13
      }
      const clientAddr = [snap.address, snap.addressLine2, snap.city, snap.country || 'Maroc'].filter((x): x is string => Boolean(x))
      clientAddr.forEach((line) => {
        doc.text(line, recipientX, rY, { width: colWidth })
        rY += 13
      })

      if (snap.ice) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('ICE : ', recipientX, rY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(snap.ice)
        rY += 13
      }
      if (snap.taxId) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('IF : ', recipientX, rY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(snap.taxId)
        rY += 13
      }
      if (snap.rc) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('RC : ', recipientX, rY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(snap.rc)
        rY += 13
      }
      if (snap.phone) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('Tél. : ', recipientX, rY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(snap.phone)
        rY += 13
      }
      if (snap.email) {
        doc.font('Helvetica-Bold').fillColor(darkColor).text('Email : ', recipientX, rY, { continued: true })
        doc.font('Helvetica').fillColor(textMuted).text(snap.email)
        rY += 13
      }

      currentY = Math.max(eY, rY) + 8

      // 4. OBJET Line if present
      if (data.subject) {
        doc.fillColor(darkColor).fontSize(10)
        doc.font('Helvetica-Bold').text('OBJET : ', 32, currentY, { continued: true })
        doc.font('Helvetica').text(data.subject || '')
        currentY += 14
      }

      currentY += 6

      // 5. Items Table Helper & Renderer
      const renderTableHeader = (y: number) => {
        doc.rect(32, y, 531.28, 22).strokeColor(borderDark).lineWidth(0.75).stroke()
        doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold')

        if (hasLineDiscount) {
          doc.text('DESCRIPTION', 38, y + 6, { width: 170 })
          doc.moveTo(215, y).lineTo(215, y + 22).stroke()
          doc.text('QTÉ', 217, y + 6, { width: 35, align: 'center' })
          doc.moveTo(255, y).lineTo(255, y + 22).stroke()
          doc.text('UNITÉ', 257, y + 6, { width: 45, align: 'center' })
          doc.moveTo(305, y).lineTo(305, y + 22).stroke()
          doc.text('P.U. HT', 307, y + 6, { width: 60, align: 'right' })
          doc.moveTo(370, y).lineTo(370, y + 22).stroke()
          doc.text('REMISE', 372, y + 6, { width: 45, align: 'right' })
          doc.moveTo(420, y).lineTo(420, y + 22).stroke()
          doc.text('TVA', 422, y + 6, { width: 40, align: 'center' })
          doc.moveTo(465, y).lineTo(465, y + 22).stroke()
          doc.text('TOTAL HT', 467, y + 6, { width: 92, align: 'right' })
        } else {
          doc.text('DESCRIPTION', 38, y + 6, { width: 195 })
          doc.moveTo(240, y).lineTo(240, y + 22).stroke()
          doc.text('QTÉ', 242, y + 6, { width: 45, align: 'center' })
          doc.moveTo(290, y).lineTo(290, y + 22).stroke()
          doc.text('UNITÉ', 292, y + 6, { width: 55, align: 'center' })
          doc.moveTo(350, y).lineTo(350, y + 22).stroke()
          doc.text('P.U. HT', 352, y + 6, { width: 65, align: 'right' })
          doc.moveTo(420, y).lineTo(420, y + 22).stroke()
          doc.text('TVA', 422, y + 6, { width: 45, align: 'center' })
          doc.moveTo(470, y).lineTo(470, y + 22).stroke()
          doc.text('TOTAL HT', 472, y + 6, { width: 88, align: 'right' })
        }
      }

      renderTableHeader(currentY)
      currentY += 22

      doc.font('Helvetica').fontSize(10)

      data.items.forEach((item) => {
        const rowH = item.description ? 30 : 22

        if (currentY + rowH > 730) {
          doc.addPage()
          drawCanvasDecorations()
          currentY = 36
          renderTableHeader(currentY)
          currentY += 22
        }

        doc.rect(32, currentY, 531.28, rowH).strokeColor(borderDark).lineWidth(0.5).stroke()
        doc.fillColor(darkColor)

        if (hasLineDiscount) {
          doc.moveTo(215, currentY).lineTo(215, currentY + rowH).stroke()
          doc.moveTo(255, currentY).lineTo(255, currentY + rowH).stroke()
          doc.moveTo(305, currentY).lineTo(305, currentY + rowH).stroke()
          doc.moveTo(370, currentY).lineTo(370, currentY + rowH).stroke()
          doc.moveTo(420, currentY).lineTo(420, currentY + rowH).stroke()
          doc.moveTo(465, currentY).lineTo(465, currentY + rowH).stroke()

          doc.text(item.title, 38, currentY + 5, { width: 170, lineBreak: false })
          if (item.description) {
            doc.fillColor(textMuted).fontSize(9).text(item.description, 38, currentY + 16, { width: 170, lineBreak: false })
            doc.fillColor(darkColor).fontSize(10)
          }

          doc.text(String(item.quantity), 217, currentY + 5, { width: 35, align: 'center' })
          doc.text(item.unit || 'Forfait', 257, currentY + 5, { width: 45, align: 'center' })
          doc.text(formatAmount(item.unitPriceHt).replace(' MAD', ''), 307, currentY + 5, { width: 60, align: 'right' })

          const discStr = Number(item.discountAmount) > 0 ? `-${formatAmount(item.discountAmount).replace(' MAD', '')}` : '—'
          doc.text(discStr, 372, currentY + 5, { width: 45, align: 'right' })
          doc.text(`${Number(item.vatRate)} %`, 422, currentY + 5, { width: 40, align: 'center' })
          doc.text(formatAmount(item.netAmountHt).replace(' MAD', ''), 467, currentY + 5, { width: 92, align: 'right' })
        } else {
          doc.moveTo(240, currentY).lineTo(240, currentY + rowH).stroke()
          doc.moveTo(290, currentY).lineTo(290, currentY + rowH).stroke()
          doc.moveTo(350, currentY).lineTo(350, currentY + rowH).stroke()
          doc.moveTo(420, currentY).lineTo(420, currentY + rowH).stroke()
          doc.moveTo(470, currentY).lineTo(470, currentY + rowH).stroke()

          doc.text(item.title, 38, currentY + 5, { width: 195, lineBreak: false })
          if (item.description) {
            doc.fillColor(textMuted).fontSize(9).text(item.description, 38, currentY + 16, { width: 195, lineBreak: false })
            doc.fillColor(darkColor).fontSize(10)
          }

          doc.text(String(item.quantity), 242, currentY + 5, { width: 45, align: 'center' })
          doc.text(item.unit || 'Forfait', 292, currentY + 5, { width: 55, align: 'center' })
          doc.text(formatAmount(item.unitPriceHt).replace(' MAD', ''), 352, currentY + 5, { width: 65, align: 'right' })
          doc.text(`${Number(item.vatRate)} %`, 422, currentY + 5, { width: 45, align: 'center' })
          doc.text(formatAmount(item.netAmountHt).replace(' MAD', ''), 472, currentY + 5, { width: 88, align: 'right' })
        }

        currentY += rowH
      })

      // Add 6 lines of white space after table (6 x 14 pt = 84 pt)
      currentY += 84

      // 6. Two-Column Lower Section: Left Side (Notes & Règlement), Right Side (Totals Block)
      if (currentY + 140 > 730) {
        doc.addPage()
        drawCanvasDecorations()
        currentY = 36
      }

      const sectionTopY = currentY

      // Left Column: NOTE / INFORMATIONS & RÈGLEMENT starting at sectionTopY
      let leftY = sectionTopY

      if (data.publicNotes) {
        doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('NOTE / INFORMATIONS :', 32, leftY)
        leftY += 14
        doc.fillColor(textMuted).fontSize(10).font('Helvetica').text(data.publicNotes, 32, leftY, { width: 260 })
        leftY += doc.heightOfString(data.publicNotes, { width: 260 }) + 10
      }

      const showBankInfo = Boolean(data.companySnapshot?.bankName || data.companySnapshot?.rib)
      if (showBankInfo) {
        doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('RÈGLEMENT', 32, leftY)
        doc.moveTo(32, leftY + 13).lineTo(100, leftY + 13).strokeColor(darkColor).lineWidth(1).stroke()

        doc.fillColor(textMuted).fontSize(10).font('Helvetica')
        let bY = leftY + 20

        if (data.companySnapshot?.bankName) {
          doc.font('Helvetica-Bold').fillColor(darkColor).text('Banque : ', 32, bY, { continued: true })
          doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.bankName)
          bY += 14
        }
        if ((data.companySnapshot as any)?.bankBranch) {
          doc.font('Helvetica-Bold').fillColor(darkColor).text('Agence : ', 32, bY, { continued: true })
          doc.font('Helvetica').fillColor(textMuted).text((data.companySnapshot as any).bankBranch)
          bY += 14
        }
        if (data.companySnapshot?.accountHolder) {
          doc.font('Helvetica-Bold').fillColor(darkColor).text('Titulaire : ', 32, bY, { continued: true })
          doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.accountHolder)
          bY += 14
        }
        if (data.companySnapshot?.rib) {
          doc.font('Helvetica-Bold').fillColor(darkColor).text('RIB : ', 32, bY, { continued: true })
          doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.rib)
          bY += 14
        }
        if (data.companySnapshot?.iban) {
          doc.font('Helvetica-Bold').fillColor(darkColor).text('IBAN : ', 32, bY, { continued: true })
          doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.iban)
          bY += 14
        }
        if (data.companySnapshot?.swiftBic) {
          doc.font('Helvetica-Bold').fillColor(darkColor).text('SWIFT : ', 32, bY, { continued: true })
          doc.font('Helvetica').fillColor(textMuted).text(data.companySnapshot.swiftBic)
          bY += 14
        }
        leftY = bY
      }

      // Right Column: Totals Block starting at exact same sectionTopY
      const totalsX = 320
      let rightY = sectionTopY
      doc.fontSize(10).font('Helvetica')

      // TOTAL HT
      doc.fillColor(darkColor).text('TOTAL HT', totalsX, rightY)
      doc.text(formatAmount(data.subtotalHt), totalsX + 80, rightY, { width: 163.28, align: 'right' })
      rightY += 14

      // REMISE (if any)
      if (Number(data.discountAmount) > 0) {
        doc.fillColor(amberAccent).text('REMISE', totalsX, rightY)
        doc.text(`- ${formatAmount(data.discountAmount)}`, totalsX + 80, rightY, { width: 163.28, align: 'right' })
        rightY += 14

        doc.fillColor(darkColor).text('TOTAL NET HT', totalsX, rightY)
        doc.text(formatAmount(data.totalNetHt), totalsX + 80, rightY, { width: 163.28, align: 'right' })
        rightY += 14
      }

      // TVA Breakdown
      const firstRate = data.items.length > 0 ? Number(data.items[0].vatRate) || 20 : 20
      doc.fillColor(darkColor).text(`TVA (${firstRate}%)`, totalsX, rightY)
      doc.text(formatAmount(data.totalVat), totalsX + 80, rightY, { width: 163.28, align: 'right' })
      rightY += 14

      // Thin Line Separator before TOTAL TTC
      doc.moveTo(totalsX, rightY + 2).lineTo(563.28, rightY + 2).strokeColor(borderDark).lineWidth(0.75).stroke()
      rightY += 6

      // TOTAL TTC
      doc.font('Helvetica-Bold').fontSize(12).fillColor(darkColor).text('TOTAL TTC', totalsX, rightY)
      doc.text(formatAmount(data.totalTtc), totalsX + 80, rightY, { width: 163.28, align: 'right' })
      rightY += 16

      // Payment Details for Facture
      if (isInvoice) {
        const paidVal = Number(data.amountPaid || 0)
        const dueVal = Number(data.amountDue || 0)

        doc.font('Helvetica').fontSize(10).fillColor(darkColor).text('MONTANT PAYÉ', totalsX, rightY)
        doc.text(formatAmount(paidVal), totalsX + 80, rightY, { width: 163.28, align: 'right' })
        rightY += 14

        // Thick Dark Line Separator before RESTE À PAYER
        doc.moveTo(totalsX, rightY + 2).lineTo(563.28, rightY + 2).strokeColor(darkColor).lineWidth(1.25).stroke()
        rightY += 6

        // RESTE À PAYER
        doc.font('Helvetica-Bold').fontSize(12).fillColor(darkColor).text('RESTE À PAYER', totalsX, rightY)
        doc.text(formatAmount(dueVal), totalsX + 80, rightY, { width: 163.28, align: 'right' })
        rightY += 18
      }

      // 7. Status Panel / Agreement Box (Placed naturally below totals on right side)
      let bottomY = Math.max(leftY, rightY) + 10
      if (bottomY + 95 > 730) {
        doc.addPage()
        drawCanvasDecorations()
        bottomY = 36
      }

      if (isQuote) {
        doc.roundedRect(300, bottomY - 4, 263.28, 85, 6).fillAndStroke('#ffffff', borderDark)
        doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('BON POUR ACCORD', 315, bottomY + 8)
        doc.fillColor(textMuted).fontSize(10).font('Helvetica')
          .text('Nom :', 315, bottomY + 26)
          .text('Date :', 315, bottomY + 42)
          .text('Signature et cachet du client :', 315, bottomY + 58)
      } else if (isInvoice) {
        if (isPaid) {
          const hasSig = Boolean(normSignature)
          const hasStamp = Boolean(normStamp)

          let panelHeight = 55
          let sigDraw: { x: number; y: number; w: number; h: number } | null = null
          let stampDraw: { x: number; y: number; w: number; h: number } | null = null

          if (hasSig && hasStamp && normSignature && normStamp) {
            // Both assets: Signature (max 235x95) on left (56%), Cachet (max 180x105) on right (40%)
            const sigScale = Math.min(235 / normSignature.width, 95 / normSignature.height)
            const sigW = Math.round(normSignature.width * sigScale)
            const sigH = Math.round(normSignature.height * sigScale)

            const stampScale = Math.min(180 / normStamp.width, 105 / normStamp.height)
            const stampW = Math.round(normStamp.width * stampScale)
            const stampH = Math.round(normStamp.height * stampScale)

            const assetAreaH = Math.max(sigH, stampH, 80)
            panelHeight = 48 + assetAreaH + 16

            // Signature zone [52..327] (width 275)
            const sigX = 52 + Math.round((275 - sigW) / 2)
            const sigY = (bottomY + 48) + Math.round((assetAreaH - sigH) / 2)
            sigDraw = { x: sigX, y: sigY, w: sigW, h: sigH }

            // Cachet zone [347..543] (width 196)
            const stampX = 347 + Math.round((196 - stampW) / 2)
            const stampY = (bottomY + 48) + Math.round((assetAreaH - stampH) / 2)
            stampDraw = { x: stampX, y: stampY, w: stampW, h: stampH }

          } else if (hasSig && normSignature) {
            // Signature only: max 235x95, centered horizontally in full-width panel [32..563.28]
            const sigScale = Math.min(235 / normSignature.width, 95 / normSignature.height)
            const sigW = Math.round(normSignature.width * sigScale)
            const sigH = Math.round(normSignature.height * sigScale)

            panelHeight = 48 + sigH + 16
            const sigX = 32 + Math.round((531.28 - sigW) / 2)
            const sigY = bottomY + 48
            sigDraw = { x: sigX, y: sigY, w: sigW, h: sigH }

          } else if (hasStamp && normStamp) {
            // Cachet only: max 185x105, centered horizontally in full-width panel [32..563.28]
            const stampScale = Math.min(185 / normStamp.width, 105 / normStamp.height)
            const stampW = Math.round(normStamp.width * stampScale)
            const stampH = Math.round(normStamp.height * stampScale)

            panelHeight = 48 + stampH + 16
            const stampX = 32 + Math.round((531.28 - stampW) / 2)
            const stampY = bottomY + 48
            stampDraw = { x: stampX, y: stampY, w: stampW, h: stampH }
          }

          // Safety check: ensure panel bottom doesn't cross footer divider at y = 780 pt
          const panelY = bottomY + 4
          const adjustedPanelY = (panelY + panelHeight > 770) ? Math.max(32, 770 - panelHeight) : panelY
          const yShift = adjustedPanelY - panelY

          // Full-width panel: X=32, Width=531.28
          doc.roundedRect(32, adjustedPanelY, 531.28, panelHeight, 6).fillAndStroke('#ffffff', greenBorder)

          // Vector Checkmark Circle + Title centered in full-width panel
          const cX = 220
          const cY = adjustedPanelY + 16
          doc.circle(cX, cY, 9).strokeColor(greenAccent).lineWidth(1.25).stroke()
          doc.moveTo(cX - 4, cY).lineTo(cX - 1, cY + 3).lineTo(cX + 5, cY - 3).strokeColor(greenAccent).lineWidth(1.25).stroke()

          doc.fillColor(greenAccent).fontSize(13).font('Helvetica-Bold').text('FACTURE ACQUITTÉE', cX + 15, cY - 4)

          doc.fillColor(textMuted).fontSize(10).font('Helvetica')
            .text(`Date de paiement : ${formatPdfDate(data.paidAt || data.issueDate)}`, 32, adjustedPanelY + 31, { width: 531.28, align: 'center' })

          if (hasSig || hasStamp) {
            // Full-width Dotted Horizontal Divider Line
            doc.save()
            doc.dash(3, { space: 3 })
            doc.moveTo(48, adjustedPanelY + 45).lineTo(547, adjustedPanelY + 45).strokeColor('#CBD5E1').lineWidth(0.75).stroke()
            doc.restore()

            if (sigDraw && normSignature) {
              try {
                doc.image(normSignature.buffer, sigDraw.x, sigDraw.y + yShift, { width: sigDraw.w, height: sigDraw.h })
              } catch {}
            }

            if (stampDraw && normStamp) {
              try {
                doc.image(normStamp.buffer, stampDraw.x, stampDraw.y + yShift, { width: stampDraw.w, height: stampDraw.h })
              } catch {}
            }
          }
        } else if (isPartiallyPaid) {
          doc.roundedRect(300, bottomY - 4, 263.28, 75, 6).fillAndStroke('#ffffff', amberAccent)
          doc.fillColor(amberAccent).fontSize(12).font('Helvetica-Bold').text('PAIEMENT PARTIEL', 315, bottomY + 8)
          doc.fillColor(textMuted).fontSize(10).font('Helvetica')
            .text(`Montant payé : ${formatAmount(data.amountPaid || 0)}`, 315, bottomY + 28)
            .text(`Reste à payer : ${formatAmount(data.amountDue || 0)}`, 315, bottomY + 46)
        } else if (isCancelled) {
          doc.roundedRect(300, bottomY - 4, 263.28, 70, 6).fillAndStroke('#ffffff', redAccent)
          doc.fillColor(redAccent).fontSize(12).font('Helvetica-Bold').text('FACTURE ANNULÉE', 315, bottomY + 8)
          doc.fillColor(textMuted).fontSize(10).font('Helvetica')
            .text(`Document annulé le ${formatPdfDate(data.cancelledAt || data.issueDate)}`, 315, bottomY + 28, { width: 233 })
        } else {
          doc.roundedRect(300, bottomY - 4, 263.28, 70, 6).fillAndStroke('#ffffff', borderDark)
          doc.fillColor(darkColor).fontSize(12).font('Helvetica-Bold').text('FACTURE À RÉGLER', 315, bottomY + 8)
          doc.fillColor(textMuted).fontSize(10).font('Helvetica')
            .text(`Échéance de paiement : ${formatPdfDate(data.dueDate)}`, 315, bottomY + 28)
        }
      }

      // 9. Footer (Center-Aligned Bold Legal Line + Address Line, No Page Numbers)
      const range = doc.bufferedPageRange()
      const iceStr = data.companySnapshot?.ice ? `ICE : ${data.companySnapshot.ice}` : null
      const rcStr = data.companySnapshot?.rc ? `RC : ${data.companySnapshot.rc}` : null
      const ifStr = data.companySnapshot?.taxId ? `IF : ${data.companySnapshot.taxId}` : null
      const cnssStr = (data.companySnapshot as any)?.cnss ? `CNSS : ${(data.companySnapshot as any).cnss}` : null

      const footerLine1 = [compName, iceStr, rcStr, ifStr, cnssStr].filter(Boolean).join('   ')
      const addressParts = [data.companySnapshot?.address, (data.companySnapshot as any)?.addressLine2, data.companySnapshot?.city, data.companySnapshot?.country || 'Maroc'].filter((x): x is string => Boolean(x))
      const footerLine2 = addressParts.join(', ')

      ;(doc.options as any).autoPageBreak = false
      if (doc.page) {
        doc.page.margins.bottom = 0
      }

      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i)
        if (doc.page) {
          doc.page.margins.bottom = 0
        }

        // Horizontal Footer Divider line at y = 780
        doc.moveTo(32, 780).lineTo(563.28, 780).strokeColor(borderDark).lineWidth(0.5).stroke()

        // Legal footer Line 1: Center-aligned Bold
        doc.fillColor(darkColor).fontSize(9.5).font('Helvetica-Bold')
        doc.text(footerLine1, 32, 786, { width: 531.28, align: 'center', lineBreak: false })

        // Legal footer Line 2: Center-aligned Address
        if (footerLine2) {
          doc.fillColor(textMuted).fontSize(8.5).font('Helvetica')
          doc.text(footerLine2, 32, 798, { width: 531.28, align: 'center', lineBreak: false })
        }
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
