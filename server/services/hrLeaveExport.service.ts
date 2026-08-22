import PDFDocument from 'pdfkit'
import { prisma } from '../utils/db'
import { formatLeaveRequestStatus } from '../../utils/hrLeaveFormatters'

export function protectCsvCell(value: unknown) {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

function formatMinutes(minutes: number | null) {
  const value = minutes || 0
  return `${Math.floor(value / 60)} h ${String(Math.abs(value % 60)).padStart(2, '0')}`
}

async function exportRows(tenantId: string) {
  return prisma.leaveRequest.findMany({
    where: { tenantId },
    select: {
      requestNumber: true,
      status: true,
      startDate: true,
      endDate: true,
      requestedMinutes: true,
      employee: { select: { employeeNumber: true, displayName: true } },
      leaveType: { select: { name: true, isPaid: true } }
    },
    orderBy: [{ startDate: 'desc' }, { requestNumber: 'desc' }]
  })
}

export async function generateLeaveCsv(tenantId: string) {
  const rows = await exportRows(tenantId)
  const headers = ['Numéro', 'Matricule', 'Collaborateur', 'Type de congé', 'Début', 'Fin', 'Durée', 'Statut', 'Rémunéré']
  const lines = [headers.map(protectCsvCell).join(';')]
  for (const row of rows) {
    lines.push([
      row.requestNumber,
      row.employee.employeeNumber,
      row.employee.displayName,
      row.leaveType.name,
      row.startDate.toISOString().slice(0, 10),
      row.endDate.toISOString().slice(0, 10),
      formatMinutes(row.requestedMinutes),
      formatLeaveRequestStatus(row.status),
      row.leaveType.isPaid ? 'Oui' : 'Non'
    ].map(protectCsvCell).join(';'))
  }
  return Buffer.from(`\uFEFF${lines.join('\r\n')}`, 'utf8')
}

export async function generateLeavePdf(tenantId: string, generatedAt = new Date()) {
  const rows = await exportRows(tenantId)
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true, info: { Title: 'Registre des congés Atlas CRM' } })
    const chunks: Buffer[] = []
    document.on('data', chunk => chunks.push(Buffer.from(chunk)))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)
    document.font('Helvetica-Bold').fontSize(18).fillColor('#2f2923').text('Atlas CRM · Registre des congés')
    document.moveDown(0.4).font('Helvetica').fontSize(12).fillColor('#5f574f').text(`Généré le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Casablanca' }).format(generatedAt)}`)
    document.moveDown()
    for (const row of rows) {
      if (document.y > 515) document.addPage()
      document.font('Helvetica-Bold').fontSize(12).fillColor('#2f2923').text(`${row.requestNumber} · ${row.employee.displayName} (${row.employee.employeeNumber})`)
      document.font('Helvetica').fontSize(12).fillColor('#5f574f').text(`${row.leaveType.name} · ${row.startDate.toISOString().slice(0, 10)} au ${row.endDate.toISOString().slice(0, 10)} · ${formatMinutes(row.requestedMinutes)} · ${formatLeaveRequestStatus(row.status)}`)
      document.moveDown(0.55)
    }
    const range = document.bufferedPageRange()
    for (let page = 0; page < range.count; page++) {
      document.switchToPage(page)
      document.font('Helvetica').fontSize(12).fillColor('#5f574f').text(`Page ${page + 1} / ${range.count}`, 36, 550, { align: 'right', width: 770 })
    }
    document.end()
  })
}
