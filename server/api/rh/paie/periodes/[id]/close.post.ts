import { randomUUID } from 'node:crypto'
import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { closePayrollPeriod } from '~/server/services/hrPayroll.service'
const schema = z.object({ confirmation: z.string(), version: z.number().int().positive() }).strict()
export default defineEventHandler(async (event) => {
  const input = schema.parse(await readBody(event))
  return closePayrollPeriod(
    String(getRouterParam(event, 'id')),
    input.confirmation,
    input.version,
    await requireHrPermission(event, 'hr.payroll.close'),
    String(event.context.requestId || randomUUID())
  )
})
