import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createStatutoryRuleSet } from '~/server/services/hrPayrollConfiguration.service'
const schema = z
  .object({
    name: z.string().min(2).max(160),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    effectiveTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    officialSourceName: z.string().max(300).nullable().optional(),
    officialSourceUrl: z.string().url().max(1000).nullable().optional(),
    sourceVerifiedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    contributionRules: z.array(z.record(z.unknown())),
    incomeTaxBrackets: z.array(z.record(z.unknown())),
    professionalExpenses: z.record(z.unknown()).optional(),
    exemptions: z.array(z.unknown()).optional()
  })
  .strict()
export default defineEventHandler(async (event) =>
  createStatutoryRuleSet(
    schema.parse(await readBody(event)),
    await requireHrPermission(event, 'hr.payroll.rules.manage')
  )
)
