import { defineEventHandler, getQuery } from 'h3'
import { hasHrPermission, requireHrPermission } from '~/server/utils/hrPermissions'
import { prisma } from '~/server/utils/db'
import { listLeaveRequests } from '~/server/services/hrLeaveRequest.service'

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.self.read')
  const query = getQuery(event)
  let employeeId = query.employeeId ? String(query.employeeId) : undefined
  let employeeIds: string[] | undefined
  if (!hasHrPermission(actor, 'hr.leave.list')) {
    const tenantId = actor.tenantId || 'default-tenant'
    const employee = await prisma.employee.findFirst({ where: { tenantId, linkedUserId: actor.id, archivedAt: null }, select: { id: true } })
    if (!employee) return []
    const allowed = new Set([employee.id])
    if (hasHrPermission(actor, 'hr.leave.team.read')) {
      const today = new Date()
      const managed = await prisma.employeeAssignment.findMany({
        where: {
          tenantId,
          managerEmployeeId: employee.id,
          startDate: { lte: today },
          OR: [{ endDate: null }, { endDate: { gte: today } }]
        },
        select: { employeeId: true }
      })
      managed.forEach(item => allowed.add(item.employeeId))
    }
    if (employeeId && !allowed.has(employeeId)) return []
    employeeIds = employeeId ? [employeeId] : [...allowed]
    employeeId = undefined
  }
  return listLeaveRequests(actor.tenantId || 'default-tenant', {
    status: query.status ? String(query.status) : undefined,
    employeeId,
    employeeIds,
    siteId: query.siteId ? String(query.siteId) : undefined
  }, false)
})
