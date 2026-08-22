import { randomUUID } from 'node:crypto'
import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { reopenPayrollPeriod } from '~/server/services/hrPayroll.service'
const schema = z
  .object({ confirmation: z.string(), reason: z.string().min(20).max(2000), version: z.number().int().positive() })
  .strict()
export default defineEventHandler(async (event) => {
  const input = schema.parse(await readBody(event))
  return reopenPayrollPeriod(
    String(getRouterParam(event, 'id')),
    input.confirmation,
    input.reason,
    input.version,
    await requireHrPermission(event, 'hr.payroll.reopen'),
    String(event.context.requestId || randomUUID())
  )
})
