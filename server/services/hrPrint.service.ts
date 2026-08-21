import PDFDocument from 'pdfkit'
import { prisma } from '../utils/db'
import { getWeekPeriodBoundaries } from './hrSchedule.service'
import type { UserPublic } from '~/types/auth'

export async function getPrintableSchedulePayload(siteId: string, dateInput: string | Date, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const { periodStart, periodEnd } = getWeekPeriodBoundaries(dateInput)

  const site = await prisma.workSite.findFirst({
    where: { id: siteId, tenantId, archivedAt: null }
  })
  if (!site) throw new Error('Site introuvable.')

  const schedule = await prisma.workSchedule.findFirst({
    where: { tenantId, siteId, periodStart },
    include: {
      publishedByUser: { select: { name: true } },
      shifts: {
        where: { status: { in: ['PLANNED', 'PUBLISHED', 'CHANGED'] } },
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              firstName: true,
              lastName: true,
              displayName: true
              // Explicitly EXCLUDE sensitive fields: cin, rib, cnss, baseSalary, internalNotes
            }
          },
          position: { select: { id: true, title: true, code: true } },
          segments: { orderBy: { order: 'asc' } }
        },
        orderBy: [{ workDate: 'asc' }]
      }
    }
  })

  return {
    siteName: site.name,
    siteCode: site.code,
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    status: schedule?.status || 'DRAFT',
    publishedAt: schedule?.publishedAt?.toISOString() || null,
    publishedByName: schedule?.publishedByUser?.name || null,
    shifts: schedule?.shifts || []
  }
}

export async function generateSchedulePdfBuffer(siteId: string, dateInput: string | Date, actor: UserPublic): Promise<Buffer> {
  const payload = await getPrintableSchedulePayload(siteId, dateInput, actor)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30,
      bufferPages: true
    })

    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', err => reject(err))

    // Header
    doc.fillColor('#0F172A').fontSize(16).text(`ATLAS CRM — PLANNING DU SITE : ${payload.siteName.toUpperCase()}`, { align: 'left' })
    doc.fontSize(10).fillColor('#475569').text(`Période du ${payload.periodStart} au ${payload.periodEnd} | Statut : ${payload.status}`)
    if (payload.publishedAt) {
      doc.text(`Publié le ${payload.publishedAt.slice(0, 10)} par ${payload.publishedByName || 'Système'}`)
    }
    doc.moveDown()

    // Table Header
    const colWidths = [150, 85, 85, 85, 85, 85, 85, 85]
    const daysHeader = ['Employé / Poste', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

    let y = doc.y
    doc.fillColor('#1E293B').rect(30, y, 782, 22).fill()
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')

    let x = 35
    daysHeader.forEach((h, i) => {
      doc.text(h, x, y + 6, { width: colWidths[i] - 5, align: i === 0 ? 'left' : 'center' })
      x += colWidths[i]
    })

    y += 26
    doc.font('Helvetica').fontSize(8)

    // Group shifts by employee
    const empMap = new Map<string, { name: string; position: string; shiftsByDay: Record<number, string[]> }>()

    for (const shift of payload.shifts) {
      const empId = shift.employee.id
      if (!empMap.has(empId)) {
        const empName = shift.employee.displayName || `${shift.employee.firstName} ${shift.employee.lastName}`
        empMap.set(empId, {
          name: `${shift.employee.employeeNumber} - ${empName}`,
          position: shift.position.title,
          shiftsByDay: {}
        })
      }

      const rec = empMap.get(empId)!
      const d = new Date(shift.workDate)
      const dayIdx = (d.getUTCDay() + 6) % 7 // 0 = Mon, 6 = Sun

      const segTexts = shift.segments
        .filter(s => s.segmentType === 'WORK')
        .map(s => `${s.startLocalTime}-${s.endLocalTime}${s.endsNextDay ? ' (+1j)' : ''}`)

      if (!rec.shiftsByDay[dayIdx]) rec.shiftsByDay[dayIdx] = []
      rec.shiftsByDay[dayIdx].push(...segTexts)
    }

    if (empMap.size === 0) {
      doc.fillColor('#64748B').text('Aucun shift planifié pour cette semaine.', 35, y)
    } else {
      for (const [, emp] of empMap) {
        if (y > 520) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 })
          y = 40
        }

        doc.fillColor('#F8FAFC').rect(30, y, 782, 24).fill()
        doc.fillColor('#0F172A').font('Helvetica-Bold').text(emp.name, 35, y + 4, { width: 140 })
        doc.fillColor('#64748B').font('Helvetica').fontSize(7).text(emp.position, 35, y + 14, { width: 140 })
        doc.fontSize(8)

        let colX = 185
        for (let i = 0; i < 7; i++) {
          const shiftText = emp.shiftsByDay[i]?.join('\n') || 'Repos'
          doc.fillColor(shiftText === 'Repos' ? '#94A3B8' : '#0F172A')
          doc.text(shiftText, colX, y + 6, { width: 80, align: 'center' })
          colX += 85
        }

        y += 28
      }
    }

    // Page Numbers footer
    const pages = doc.bufferedPageRange()
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i)
      doc.fillColor('#94A3B8').fontSize(8).text(
        `Page ${i + 1} sur ${pages.count} — Document confidentiel généré par Atlas CRM (Atlas Bites SARL)`,
        30,
        565,
        { align: 'center', width: 782 }
      )
    }

    doc.end()
  })
}
