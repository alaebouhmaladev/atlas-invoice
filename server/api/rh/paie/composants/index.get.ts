import { defineEventHandler } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { prisma } from '~/server/utils/db'
export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.payroll.rules.read')
  return prisma.salaryComponentDefinition.findMany({
    where: { tenantId: actor.tenantId || 'default-tenant' },
    orderBy: { calculationOrder: 'asc' }
  })
})
