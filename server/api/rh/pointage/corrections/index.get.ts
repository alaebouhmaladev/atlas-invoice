import { defineEventHandler, getQuery } from 'h3'
import { CorrectionRequestStatus } from '@prisma/client'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getCorrectionRequests } from '~/server/services/hrAttendanceCorrection.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.read')
  const query = getQuery(event)
  const siteId = query.siteId ? String(query.siteId) : undefined
  const status = query.status ? (String(query.status) as CorrectionRequestStatus) : undefined

  return getCorrectionRequests(user.tenantId || 'default-tenant', siteId, status)
})
