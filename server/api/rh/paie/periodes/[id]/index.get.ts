import { defineEventHandler, getRouterParam } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getPayrollPeriod } from '~/server/services/hrPayroll.service'

export default defineEventHandler(async (event) =>
  getPayrollPeriod(String(getRouterParam(event, 'id')), await requireHrPermission(event, 'hr.payroll.read'))
)
