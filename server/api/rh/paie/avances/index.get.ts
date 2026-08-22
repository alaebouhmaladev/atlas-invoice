import { defineEventHandler } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { listPayrollDebts } from '~/server/services/hrPayrollDebt.service'
export default defineEventHandler(
  async (event) => (await listPayrollDebts(await requireHrPermission(event, 'hr.payroll.advance.manage'))).advances
)
