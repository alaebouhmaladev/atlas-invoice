import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createPayrollVariable } from '~/server/services/hrPayroll.service'
const decimal = z.string().regex(/^\d+(\.\d{1,6})?$/)
const schema = z
  .object({
    periodId: z.string().uuid(),
    employeeId: z.string().uuid(),
    componentDefinitionId: z.string().uuid(),
    amount: decimal,
    quantity: decimal.optional(),
    rate: decimal.optional(),
    description: z.string().max(500).optional(),
    idempotencyKey: z.string().min(8).max(120)
  })
  .strict()
export default defineEventHandler(async (event) =>
  createPayrollVariable(
    schema.parse(await readBody(event)),
    await requireHrPermission(event, 'hr.payroll.variable.manage')
  )
)
