import PDFDocument from 'pdfkit'
import { prisma } from '../utils/db'
import { getCompanySettings } from './companySettings.service'

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""'
  let str = String(val).replace(/"/g, '""')
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str
  }
  return `"${str}"`
}

export async function generateAttendanceCsvBuffer(
  tenantId: string,
  siteId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<Buffer> {
  const days = await prisma.attendanceDay.findMany({
    where: {
      tenantId,
      ...(siteId ? { siteId } : {}),
      ...(startDate && endDate ? { workDate: { gte: startDate, lte: endDate } } : {})
    },
    include: {
      employee: true,
      site: true
    },
    orderBy: [{ workDate: 'asc' }, { employee: { lastName: 'asc' } }]
  })

  const headers = [
    'Matricule',
    'Employé',
    'Site',
    'Date de travail',
    'Heures prévues (min)',
    'Heures travaillées (min)',
    'Pause (min)',
    'Retard (min)',
    'Départ anticipé (min)',
    'Heures suppl. (min)',
    'Statut Journée',
    'Statut Validation'
  ]

  const rows = [headers.map(escapeCsvCell).join(',')]

  for (const d of days) {
    const row = [
      d.employee.employeeNumber,
      d.employee.displayName,
      d.site.name,
      d.workDate.toISOString().split('T')[0],
      d.plannedMinutes,
      d.netWorkedMinutes,
      d.paidBreakMinutes + d.unpaidBreakMinutes,
      d.lateMinutes,
      d.earlyDepartureMinutes,
      d.overtimeMinutes,
      d.status,
      d.validationStatus
    ]
    rows.push(row.map(escapeCsvCell).join(','))
  }

  return Buffer.from(rows.join('\n'), 'utf-8')
}

export async function generateAttendancePdfBuffer(
  tenantId: string,
  siteId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<Buffer> {
  const company = await getCompanySettings()
  const days = await prisma.attendanceDay.findMany({
    where: {
      tenantId,
      ...(siteId ? { siteId } : {}),
      ...(startDate && endDate ? { workDate: { gte: startDate, lte: endDate } } : {})
    },
    include: {
      employee: true,
      site: true
    },
    orderBy: [{ workDate: 'asc' }, { employee: { lastName: 'asc' } }]
  })

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 })
    const buffers: Buffer[] = []

    doc.on('data', (chunk) => buffers.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', (err) => reject(err))

    // Header
    doc.fillColor('#0F172A').rect(0, 0, 841.89, 60).fill()
    doc.fillColor('#F59E0B').fontSize(18).text('Atlas CRM — Rapport de Présences & Pointage', 30, 20)
    doc.fillColor('#94A3B8').fontSize(10).text(`Société : ${company.legalName} | Généré le : ${new Date().toISOString().split('T')[0]} (Africa/Casablanca)`, 30, 42)

    doc.moveDown(2)

    // Table Headers
    const startY = 80
    doc.fillColor('#1E293B').rect(30, startY, 781, 24).fill()
    doc.fillColor('#F8FAFC').fontSize(9).font('Helvetica-Bold')

    doc.text('Matricule', 35, startY + 7, { width: 80 })
    doc.text('Employé', 120, startY + 7, { width: 140 })
    doc.text('Site', 270, startY + 7, { width: 110 })
    doc.text('Date', 390, startY + 7, { width: 80 })
    doc.text('Prévu (h)', 480, startY + 7, { width: 60 })
    doc.text('Effectif (h)', 550, startY + 7, { width: 60 })
    doc.text('Retard (m)', 620, startY + 7, { width: 60 })
    doc.text('H.Suppl (m)', 690, startY + 7, { width: 60 })
    doc.text('Statut', 760, startY + 7, { width: 50 })

    let currentY = startY + 28
    doc.font('Helvetica').fontSize(8).fillColor('#334155')

    for (const d of days) {
      if (currentY > 530) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 })
        currentY = 40
      }

      const plannedH = (d.plannedMinutes / 60).toFixed(1)
      const workedH = (d.netWorkedMinutes / 60).toFixed(1)

      doc.text(d.employee.employeeNumber, 35, currentY, { width: 80 })
      doc.text(d.employee.displayName, 120, currentY, { width: 140 })
      doc.text(d.site.name, 270, currentY, { width: 110 })
      doc.text(d.workDate.toISOString().split('T')[0], 390, currentY, { width: 80 })
      doc.text(`${plannedH}h`, 480, currentY, { width: 60 })
      doc.text(`${workedH}h`, 550, currentY, { width: 60 })
      doc.text(`${d.lateMinutes}m`, 620, currentY, { width: 60 })
      doc.text(`${d.overtimeMinutes}m`, 690, currentY, { width: 60 })
      doc.text(d.status, 760, currentY, { width: 50 })

      currentY += 18
    }

    doc.end()
  })
}
