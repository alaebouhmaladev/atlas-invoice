import { defineEventHandler, getQuery } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getAttendanceTerminals } from '~/server/services/hrAttendanceTerminal.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.terminal.manage')
  const query = getQuery(event)
  const siteId = query.siteId ? String(query.siteId) : undefined

  return getAttendanceTerminals(user.tenantId || 'default-tenant', siteId)
})
