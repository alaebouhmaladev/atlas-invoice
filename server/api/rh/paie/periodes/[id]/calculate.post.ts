import { randomUUID } from 'node:crypto'
import { defineEventHandler, getRouterParam } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { calculatePayrollPeriod } from '~/server/services/hrPayroll.service'

export default defineEventHandler(async (event) =>
  calculatePayrollPeriod(
    String(getRouterParam(event, 'id')),
    await requireHrPermission(event, 'hr.payroll.calculate'),
    String(event.context.requestId || randomUUID())
  )
)
