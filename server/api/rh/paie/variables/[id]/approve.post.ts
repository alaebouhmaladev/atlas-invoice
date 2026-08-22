import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { approvePayrollVariable } from '~/server/services/hrPayroll.service'
const schema = z
  .object({ approve: z.boolean(), reason: z.string().max(1000).optional(), version: z.number().int().positive() })
  .strict()
export default defineEventHandler(async (event) => {
  const input = schema.parse(await readBody(event))
  return approvePayrollVariable(
    String(getRouterParam(event, 'id')),
    input.approve,
    input.reason,
    input.version,
    await requireHrPermission(event, 'hr.payroll.variable.approve')
  )
})
