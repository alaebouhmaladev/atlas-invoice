import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { hasHrPermission, requireHrPermission } from '~/server/utils/hrPermissions'
import { getLeaveRequest } from '~/server/services/hrLeaveRequest.service'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.self.read')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Identifiant manquant.' })
  const includePrivate = getQuery(event).includePrivate === 'true' && hasHrPermission(actor, 'hr.leave.read_medical')
  const request = await getLeaveRequest(actor.tenantId || 'default-tenant', id, includePrivate)
  if (!request) throw createError({ statusCode: 404, statusMessage: 'Demande introuvable.' })
  if (!hasHrPermission(actor, 'hr.leave.read')) {
    const tenantId = actor.tenantId || 'default-tenant'
    const linked = await prisma.employee.findFirst({ where: { tenantId, linkedUserId: actor.id, archivedAt: null }, select: { id: true } })
    const own = linked?.id === request.employeeId
    const managed = !own && linked && hasHrPermission(actor, 'hr.leave.team.read')
      ? await prisma.employeeAssignment.count({
          where: {
            tenantId,
            employeeId: request.employeeId,
            managerEmployeeId: linked.id,
            startDate: { lte: request.startDate },
            OR: [{ endDate: null }, { endDate: { gte: request.endDate } }]
          }
        })
      : 0
    if (!own && !managed) throw createError({ statusCode: 403, statusMessage: 'Accès interdit à cette demande.' })
  }
  return request
})
