import { defineEventHandler, getQuery, setHeader } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { generateAttendanceCsvBuffer, generateAttendancePdfBuffer } from '~/server/services/hrAttendanceExport.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.export')
  const tenantId = user.tenantId || 'default-tenant'
  const query = getQuery(event)

  const format = query.format ? String(query.format).toLowerCase() : 'csv'
  const siteId = query.siteId ? String(query.siteId) : undefined
  const startDate = query.startDate ? new Date(String(query.startDate) + 'T00:00:00.000Z') : undefined
  const endDate = query.endDate ? new Date(String(query.endDate) + 'T23:59:59.999Z') : undefined

  if (format === 'pdf') {
    const pdfBuffer = await generateAttendancePdfBuffer(tenantId, siteId, startDate, endDate)
    setHeader(event, 'Content-Type', 'application/pdf')
    setHeader(event, 'Content-Disposition', `attachment; filename="pointage-presences-${new Date().toISOString().split('T')[0]}.pdf"`)
    return pdfBuffer
  }

  const csvBuffer = await generateAttendanceCsvBuffer(tenantId, siteId, startDate, endDate)
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="pointage-presences-${new Date().toISOString().split('T')[0]}.csv"`)
  return csvBuffer
})
