import { defineEventHandler } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { listPayrollPeriods } from '~/server/services/hrPayroll.service'

export default defineEventHandler(async (event) =>
  listPayrollPeriods(await requireHrPermission(event, 'hr.payroll.read'))
)
