import { defineEventHandler } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { listPayrollSettings } from '~/server/services/hrPayrollConfiguration.service'
export default defineEventHandler(async (event) =>
  listPayrollSettings(await requireHrPermission(event, 'hr.payroll.rules.read'))
)
