import { randomUUID } from 'node:crypto'
import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { validatePayrollPeriod } from '~/server/services/hrPayroll.service'
const schema = z.object({ confirmation: z.string(), version: z.number().int().positive() }).strict()
export default defineEventHandler(async (event) => {
  const input = schema.parse(await readBody(event))
  return validatePayrollPeriod(
    String(getRouterParam(event, 'id')),
    input.confirmation,
    input.version,
    await requireHrPermission(event, 'hr.payroll.validate'),
    String(event.context.requestId || randomUUID())
  )
})
