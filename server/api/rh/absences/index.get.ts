import { defineEventHandler, getQuery } from 'h3'
import { hasHrPermission, requireHrPermission } from '~/server/utils/hrPermissions'
import { listAbsences } from '~/server/services/hrAbsence.service'

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.absence.read')
  const query = getQuery(event)
  const includePrivate = query.includePrivate === 'true' && hasHrPermission(actor, 'hr.leave.read_medical')
  return listAbsences(actor.tenantId || 'default-tenant', {
    siteId: query.siteId ? String(query.siteId) : undefined,
    employeeId: query.employeeId ? String(query.employeeId) : undefined,
    status: query.status ? String(query.status) as any : undefined
  }, includePrivate)
})
