import { defineEventHandler, getQuery } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { prisma } from '~/server/utils/db'
export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.payroll.variable.read')
  const query = getQuery(event)
  return prisma.payrollVariable.findMany({
    where: {
      tenantId: actor.tenantId || 'default-tenant',
      ...(query.periodId ? { periodId: String(query.periodId) } : {})
    },
    include: { componentDefinition: { select: { code: true, name: true, kind: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200
  })
})
