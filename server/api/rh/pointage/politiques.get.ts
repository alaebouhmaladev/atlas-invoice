import { defineEventHandler, getQuery } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getAttendancePolicy } from '~/server/services/hrAttendancePolicy.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.read')
  const query = getQuery(event)
  const siteId = query.siteId ? String(query.siteId) : undefined

  return getAttendancePolicy(user.tenantId || 'default-tenant', siteId)
})
