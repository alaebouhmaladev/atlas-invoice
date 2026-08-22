import PDFDocument from 'pdfkit'
import type { UserPublic } from '../../types/auth'
import { prisma } from '../utils/db'

const tenantOf = (actor: UserPublic) => actor.tenantId || 'default-tenant'

export async function getAuthorizedPayrollRecord(recordId: string, actor: UserPublic, ownOnly = false) {
  const tenantId = tenantOf(actor)
  const record = await prisma.payrollRecord.findFirst({
    where: { id: recordId, tenantId },
    include: { period: true, lines: { orderBy: { calculationOrder: 'asc' } } }
  })
  if (!record) throw Object.assign(new Error('Bulletin de paie introuvable.'), { statusCode: 404 })
  if (ownOnly) {
    const employee = await prisma.employee.findFirst({
      where: { id: record.employeeId, tenantId, linkedUserId: actor.id }
    })
    if (!employee || !['VALIDATED', 'CLOSED'].includes(record.status))
      throw Object.assign(new Error('Vous ne pouvez consulter que vos bulletins finalisés.'), { statusCode: 403 })
  }
  return record
}

export async function generatePayslipPdf(
  recordId: string,
  actor: UserPublic,
  ownOnly = false
): Promise<{ buffer: Buffer; filename: string; checksumFragment: string }> {
  const record = await getAuthorizedPayrollRecord(recordId, actor, ownOnly)
  if (!['VALIDATED', 'CLOSED'].includes(record.status))
    throw Object.assign(new Error('Le bulletin n’est disponible qu’après validation.'), { statusCode: 409 })
  const company = await prisma.companySettings.findUnique({ where: { id: 'DEFAULT' } })
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 42, right: 42, bottom: 42, left: 42 },
    info: { Title: `Bulletin ${record.period.periodNumber}`, Author: 'Atlas CRM' }
  })
  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
  const money = (value: { toFixed(decimals: number): string }) => `${value.toFixed(2)} MAD`
  const checksumFragment = record.calculationHash.slice(0, 12).toUpperCase()

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#1f2937')
    .text(company?.tradeName || company?.legalName || 'Atlas CRM')
  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#4b5563')
    .text([company?.address, company?.city, company?.country].filter(Boolean).join(' · '))
  doc.moveDown().font('Helvetica-Bold').fontSize(16).fillColor('#111827').text('BULLETIN DE PAIE', { align: 'center' })
  doc.font('Helvetica').fontSize(12).text(record.period.name, { align: 'center' }).moveDown()
  doc.font('Helvetica-Bold').text('Salarié')
  doc.font('Helvetica').text(`${record.employeeNameSnapshot} — ${record.employeeNumberSnapshot}`)
  doc.text(`Poste : ${record.positionSnapshot || 'Non renseigné'}`)
  doc.text(`Site / département : ${record.siteSnapshot || '—'} / ${record.departmentSnapshot || '—'}`)
  doc.text(`RIB : ${record.bankMaskedSnapshot || 'Non renseigné'}`).moveDown()
  doc.font('Helvetica-Bold').text('Éléments de paie')
  doc.moveDown(0.4)
  for (const line of record.lines) {
    if (doc.y > 720) {
      doc.addPage()
      doc.font('Helvetica').fontSize(12)
    }
    doc
      .font(line.componentCodeSnapshot === 'SALAIRE_BASE' ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(12)
      .text(line.componentNameSnapshot, 42, doc.y, { width: 350, continued: true })
      .text(money(line.employeeAmount), { width: 160, align: 'right' })
  }
  doc.moveDown().font('Helvetica-Bold').fontSize(12)
  const totals = [
    ['Salaire brut', money(record.grossSalary)],
    ['Cotisations salarié', money(record.employeeContributions)],
    ['Impôt sur le revenu', money(record.incomeTax)],
    ['Total des retenues', money(record.totalDeductions)],
    ['NET À PAYER', money(record.netPayable)],
    ['Coût employeur', money(record.employerCost)]
  ]
  for (const [label, value] of totals)
    doc.text(label, 42, doc.y, { width: 350, continued: true }).text(value, { width: 160, align: 'right' })
  doc
    .moveDown()
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#4b5563')
    .text(`Mode de paiement : virement bancaire · Référence de vérification : ${checksumFragment}`)
  doc.text(
    `Généré le ${new Intl.DateTimeFormat('fr-MA', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Casablanca' }).format(new Date())}`
  )
  doc.end()
  const buffer = await complete
  if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-')) || !buffer.toString('latin1').includes('%%EOF'))
    throw new Error('Le document PDF généré est invalide.')
  return {
    buffer,
    filename: `bulletin-${record.period.year}-${String(record.period.month).padStart(2, '0')}-${record.employeeNumberSnapshot.replace(/[^A-Za-z0-9_-]/g, '-')}.pdf`,
    checksumFragment
  }
}
