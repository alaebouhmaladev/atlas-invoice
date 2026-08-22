import { defineEventHandler, getRouterParam } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { inspectPayrollReadiness } from '~/server/services/hrPayroll.service'

export default defineEventHandler(async (event) =>
  inspectPayrollReadiness(String(getRouterParam(event, 'id')), await requireHrPermission(event, 'hr.payroll.prepare'))
)
