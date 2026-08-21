import { defineEventHandler, getQuery } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.read')
  const tenantId = user.tenantId || 'default-tenant'
  const query = getQuery(event)

  const siteId = query.siteId ? String(query.siteId) : undefined
  const employeeId = query.employeeId ? String(query.employeeId) : undefined
  const status = query.status ? String(query.status) : undefined
  const startDate = query.startDate ? new Date(String(query.startDate) + 'T00:00:00.000Z') : undefined
  const endDate = query.endDate ? new Date(String(query.endDate) + 'T23:59:59.999Z') : undefined

  return prisma.attendanceDay.findMany({
    where: {
      tenantId,
      ...(siteId ? { siteId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(startDate && endDate ? { workDate: { gte: startDate, lte: endDate } } : {})
    },
    include: {
      employee: {
        select: { id: true, employeeNumber: true, displayName: true, firstName: true, lastName: true }
      },
      site: {
        select: { id: true, code: true, name: true }
      },
      anomalies: true,
      correctionRequests: true
    },
    orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }]
  })
})
