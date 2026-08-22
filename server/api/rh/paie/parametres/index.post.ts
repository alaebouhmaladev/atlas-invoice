import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { upsertPayrollConfiguration } from '~/server/services/hrPayrollConfiguration.service'
const schema = z
  .object({
    id: z.string().uuid().optional(),
    version: z.number().int().positive().optional(),
    name: z.string().min(2).max(160),
    standardMonthlyMinutes: z.number().int().positive(),
    standardWeeklyMinutes: z.number().int().positive(),
    prorationMethod: z.enum(['CALENDAR_DAYS', 'WORKING_DAYS', 'SCHEDULED_MINUTES', 'VALIDATED_MINUTES']),
    paymentDay: z.number().int().min(1).max(31),
    attendanceCutoffDay: z.number().int().min(1).max(31),
    leaveCutoffDay: z.number().int().min(1).max(31),
    overtimeRules: z.record(z.unknown()).optional(),
    accountingMappings: z.record(z.unknown()).optional(),
    bankExportConfiguration: z.record(z.unknown()).optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    effectiveTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    isActive: z.boolean().optional()
  })
  .strict()
export default defineEventHandler(async (event) =>
  upsertPayrollConfiguration(
    schema.parse(await readBody(event)),
    await requireHrPermission(event, 'hr.payroll.rules.manage')
  )
)
