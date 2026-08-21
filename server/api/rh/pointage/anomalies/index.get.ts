import { defineEventHandler, getQuery } from 'h3'
import { AttendanceAnomalySeverity } from '@prisma/client'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getAnomalies } from '~/server/services/hrAttendanceAnomaly.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.read')
  const query = getQuery(event)
  const siteId = query.siteId ? String(query.siteId) : undefined
  const isResolved = query.isResolved !== undefined ? query.isResolved === 'true' : undefined
  const severity = query.severity ? (String(query.severity) as AttendanceAnomalySeverity) : undefined

  return getAnomalies(user.tenantId || 'default-tenant', siteId, isResolved, severity)
})
