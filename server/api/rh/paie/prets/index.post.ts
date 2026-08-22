import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createLoan } from '~/server/services/hrPayrollDebt.service'
const money = z.string().regex(/^\d+(\.\d{1,2})?$/)
const schema = z
  .object({
    employeeId: z.string().uuid(),
    reference: z.string().min(2).max(80),
    amount: money,
    disbursementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    repaymentStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    installmentAmount: money,
    installmentCount: z.number().int().min(1).max(600),
    reason: z.string().max(1000).optional()
  })
  .strict()
export default defineEventHandler(async (event) =>
  createLoan(schema.parse(await readBody(event)), await requireHrPermission(event, 'hr.payroll.loan.manage'))
)
