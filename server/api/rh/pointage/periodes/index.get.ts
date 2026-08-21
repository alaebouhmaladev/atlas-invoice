import { defineEventHandler, getQuery } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.read')
  const query = getQuery(event)
  const siteId = query.siteId ? String(query.siteId) : undefined

  return prisma.attendancePeriodLock.findMany({
    where: {
      tenantId: user.tenantId || 'default-tenant',
      ...(siteId ? { siteId } : {})
    },
    include: {
      site: { select: { id: true, code: true, name: true } },
      lockedBy: { select: { id: true, name: true } },
      unlockedBy: { select: { id: true, name: true } }
    },
    orderBy: { lockedAt: 'desc' }
  })
})
