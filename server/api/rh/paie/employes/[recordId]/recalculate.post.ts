import { randomUUID } from 'node:crypto'
import { defineEventHandler, getRouterParam } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { prisma } from '~/server/utils/db'
import { calculatePayrollPeriod } from '~/server/services/hrPayroll.service'
export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.payroll.calculate')
  const tenantId = actor.tenantId || 'default-tenant'
  const record = await prisma.payrollRecord.findFirst({
    where: { id: String(getRouterParam(event, 'recordId')), tenantId },
    select: { periodId: true, status: true }
  })
  if (!record) throw Object.assign(new Error('Calcul salarié introuvable.'), { statusCode: 404 })
  if (['VALIDATED', 'CLOSED'].includes(record.status))
    throw Object.assign(new Error('Ce calcul est figé et ne peut plus être modifié.'), { statusCode: 409 })
  return calculatePayrollPeriod(record.periodId, actor, String(event.context.requestId || randomUUID()))
})
