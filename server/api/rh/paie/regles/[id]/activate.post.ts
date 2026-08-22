import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { verifyAndActivateRuleSet } from '~/server/services/hrPayrollConfiguration.service'
const schema = z
  .object({
    version: z.number().int().positive(),
    confirmation: z.string(),
    officialSourceName: z.string().min(2).max(300),
    officialSourceUrl: z.string().url().startsWith('https://'),
    verificationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })
  .strict()
export default defineEventHandler(async (event) =>
  verifyAndActivateRuleSet(
    String(getRouterParam(event, 'id')),
    schema.parse(await readBody(event)),
    await requireHrPermission(event, 'hr.payroll.rules.manage')
  )
)
