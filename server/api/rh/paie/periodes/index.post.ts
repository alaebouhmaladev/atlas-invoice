import { randomUUID } from 'node:crypto'
import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createPayrollPeriod } from '~/server/services/hrPayroll.service'

const schema = z
  .object({
    year: z.number().int().min(2020).max(2100),
    month: z.number().int().min(1).max(12),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    statutoryRuleSetId: z.string().uuid().nullable().optional(),
    payrollConfigurationId: z.string().uuid().nullable().optional()
  })
  .strict()
export default defineEventHandler(async (event) =>
  createPayrollPeriod(
    schema.parse(await readBody(event)),
    await requireHrPermission(event, 'hr.payroll.prepare'),
    String(event.context.requestId || randomUUID())
  )
)
