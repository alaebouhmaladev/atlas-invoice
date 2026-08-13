import PDFDocument from 'pdfkit'
import { formatMoney } from '../utils/calculation'

export interface ClientSnapshotData {
  displayName: string
  type: string
  companyName?: string | null
  firstName?: string | null
  lastName?: string | null
  ice?: string | null
  taxId?: string | null
  rc?: string | null
  cnss?: string | null
  patent?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  addressLine2?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  contactName?: string | null
}

export interface QuotePdfItem {
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

export interface QuotePdfData {
  number: string
  issueDate: Date | string
  validUntil: Date | string
  clientSnapshot: ClientSnapshotData
  currency?: string
  subtotalHt: string | number
  discountAmount: string | number
  totalNetHt: string | number
  totalVat: string | number
  totalTtc: string | number
  subject?: string | null
  paymentTerms?: string | null
  publicNotes?: string | null
  items: QuotePdfItem[]
}

export function generateQuotePdfBuffer(data: QuotePdfData): Promise<Buffer> {
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

      // Company Info Fallbacks
      const companyName = process.env.COMPANY_NAME || 'Atlas Bites SARL'
      const companyAddress = process.env.COMPANY_ADDRESS || '123 Boulevard Zerktouni'
      const companyCity = process.env.COMPANY_CITY || 'Casablanca, Maroc'
      const companyIce = process.env.COMPANY_ICE || '001234567890123'
      const companyIf = process.env.COMPANY_IF || '12345678'
      const companyRc = process.env.COMPANY_RC || '98765 Casablanca'
      const companyPhone = process.env.COMPANY_PHONE || '+212 522 12 34 56'
      const companyEmail = process.env.COMPANY_EMAIL || 'contact@atlasbites.ma'

      // Formatting Dates
      const issueDateStr = new Date(data.issueDate).toLocaleDateString('fr-FR')
      const validUntilStr = new Date(data.validUntil).toLocaleDateString('fr-FR')

      // Colors
      const primaryColor = '#d97706' // Amber-600
      const darkColor = '#0f172a' // Slate-900
      const textMuted = '#475569' // Slate-600
      const lightBg = '#f8fafc' // Slate-50

      // 1. Header (Company Identity + Title)
      doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text('ATLAS BITES', 40, 40)
      doc.fillColor(darkColor).fontSize(9).font('Helvetica').text('TRAITEUR & EVENEMENTIEL', 40, 63)
      doc.fillColor(textMuted).fontSize(8)
        .text(`${companyName} • ${companyAddress}, ${companyCity}`, 40, 75)
        .text(`ICE: ${companyIce} | IF: ${companyIf} | RC: ${companyRc}`, 40, 86)
        .text(`Tél: ${companyPhone} | Email: ${companyEmail}`, 40, 97)

      // Devis Title Box Right
      doc.fillColor(darkColor).fontSize(18).font('Helvetica-Bold').text('DEVIS', 380, 40, { align: 'right' })
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text(data.number, 380, 62, { align: 'right' })
      doc.fillColor(textMuted).fontSize(8).font('Helvetica')
        .text(`Date d'émission : ${issueDateStr}`, 380, 78, { align: 'right' })
        .text(`Date de validité : ${validUntilStr}`, 380, 89, { align: 'right' })

      doc.moveTo(40, 115).lineTo(555, 115).strokeColor('#e2e8f0').lineWidth(1).stroke()

      // 2. Client Snapshot Box
      const snap = data.clientSnapshot || {}
      doc.rect(40, 125, 515, 80).fillAndStroke(lightBg, '#cbd5e1')
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('CLIENT', 52, 133)
      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text(snap.displayName || 'Client Inconnu', 52, 146)

      doc.fillColor(textMuted).fontSize(8).font('Helvetica')
      let clientInfoLine2 = ''
      if (snap.ice) clientInfoLine2 += `ICE: ${snap.ice}  `
      if (snap.taxId) clientInfoLine2 += `IF: ${snap.taxId}  `
      if (snap.rc) clientInfoLine2 += `RC: ${snap.rc}`
      doc.text(clientInfoLine2, 52, 161)

      let addressStr = snap.address || ''
      if (snap.city) addressStr += `, ${snap.city}`
      if (snap.country) addressStr += ` (${snap.country})`
      doc.text(addressStr, 52, 173)

      if (snap.phone || snap.email) {
        doc.text(`Tél: ${snap.phone || '—'} | Email: ${snap.email || '—'}`, 52, 185)
      }

      // Subject line
      let currentY = 215
      if (data.subject) {
        doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold').text(`Objet : ${data.subject}`, 40, currentY)
        currentY += 16
      }

      // 3. Items Table Header
      const tableTop = currentY + 5
      drawTableHeader(doc, tableTop, primaryColor)
      currentY = tableTop + 20

      // Table Rows
      doc.font('Helvetica').fontSize(8)
      data.items.forEach((item, idx) => {
        if (currentY > 700) {
          doc.addPage()
          currentY = 40
          drawTableHeader(doc, currentY, primaryColor)
          currentY += 20
        }

        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
        doc.rect(40, currentY - 3, 515, 18).fill(bg)

        doc.fillColor(darkColor)
          .text(item.title, 45, currentY, { width: 195, lineBreak: false })
          .text(String(item.quantity), 245, currentY, { width: 40, align: 'right' })
          .text(item.unit, 290, currentY, { width: 45, align: 'center' })
          .text(formatMoney(item.unitPriceHt).replace(' MAD', ''), 340, currentY, { width: 65, align: 'right' })
          .text(`${item.vatRate}%`, 410, currentY, { width: 35, align: 'right' })
          .text(formatMoney(item.netAmountHt).replace(' MAD', ''), 450, currentY, { width: 100, align: 'right' })

        currentY += 18

        if (item.description) {
          doc.fillColor(textMuted).fontSize(7.5).text(item.description, 55, currentY, { width: 185 })
          currentY += 12
          doc.fontSize(8)
        }
      })

      doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor('#cbd5e1').stroke()
      currentY += 15

      // 4. Totals Block
      if (currentY > 680) {
        doc.addPage()
        currentY = 50
      }

      const totalsX = 350
      const totalsW = 205

      doc.rect(totalsX, currentY, totalsW, 90).fillAndStroke('#f1f5f9', '#cbd5e1')

      let tY = currentY + 8
      doc.fillColor(textMuted).fontSize(8).font('Helvetica')
        .text('Sous-total HT :', totalsX + 10, tY)
        .text(formatMoney(data.subtotalHt), totalsX + 80, tY, { width: 115, align: 'right' })

      tY += 14
      doc.text('Remises :', totalsX + 10, tY)
        .text(`- ${formatMoney(data.discountAmount)}`, totalsX + 80, tY, { width: 115, align: 'right' })

      tY += 14
      doc.text('Total Net HT :', totalsX + 10, tY)
        .text(formatMoney(data.totalNetHt), totalsX + 80, tY, { width: 115, align: 'right' })

      tY += 14
      doc.text('TVA Total :', totalsX + 10, tY)
        .text(formatMoney(data.totalVat), totalsX + 80, tY, { width: 115, align: 'right' })

      tY += 16
      doc.rect(totalsX, tY - 2, totalsW, 22).fill(primaryColor)
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
        .text('Total TTC :', totalsX + 10, tY + 2)
        .text(formatMoney(data.totalTtc), totalsX + 80, tY + 2, { width: 115, align: 'right' })

      // 5. Payment Conditions & Public Notes
      let leftY = currentY
      if (data.paymentTerms || data.publicNotes) {
        doc.fillColor(darkColor).fontSize(8.5).font('Helvetica-Bold').text('Conditions & Remarques :', 40, leftY)
        leftY += 12
        doc.fillColor(textMuted).fontSize(8).font('Helvetica')
        if (data.paymentTerms) {
          doc.text(`Conditions de paiement: ${data.paymentTerms}`, 40, leftY, { width: 290 })
          leftY += 14
        }
        if (data.publicNotes) {
          doc.text(data.publicNotes, 40, leftY, { width: 290 })
        }
      }

      // 6. Signature & Stamp Box ("Bon pour accord")
      const sigY = Math.max(currentY + 105, leftY + 30)
      if (sigY < 730) {
        doc.rect(40, sigY, 240, 65).fillAndStroke('#ffffff', '#cbd5e1')
        doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold').text('BON POUR ACCORD', 50, sigY + 8)
        doc.fillColor(textMuted).fontSize(7.5).font('Helvetica')
          .text('Date :', 50, sigY + 22)
          .text('Nom & Signature du client :', 50, sigY + 34)
          .text('(Précédé de la mention "Lu et approuvé")', 50, sigY + 46)

        doc.rect(315, sigY, 240, 65).fillAndStroke('#ffffff', '#cbd5e1')
        doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold').text('CACHET & SIGNATURE ATLAS BITES', 325, sigY + 8)
      }

      // 7. Footer & Page Numbers
      const range = doc.bufferedPageRange()
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i)
        doc.moveTo(40, 800).lineTo(555, 800).strokeColor('#cbd5e1').lineWidth(0.5).stroke()
        doc.fillColor(textMuted).fontSize(7.5).font('Helvetica')
          .text(`${companyName} • Devis ${data.number}`, 40, 808, { align: 'left' })
          .text(`Page ${i + 1} sur ${range.count}`, 40, 808, { align: 'right' })
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

function drawTableHeader(doc: InstanceType<typeof PDFDocument>, y: number, primaryColor: string) {
  doc.rect(40, y, 515, 18).fill(primaryColor)
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
    .text('Désignation', 45, y + 4, { width: 195 })
    .text('Qté', 245, y + 4, { width: 40, align: 'right' })
    .text('Unité', 290, y + 4, { width: 45, align: 'center' })
    .text('P.U. HT', 340, y + 4, { width: 65, align: 'right' })
    .text('TVA', 410, y + 4, { width: 35, align: 'right' })
    .text('Total HT (MAD)', 450, y + 4, { width: 100, align: 'right' })
}
