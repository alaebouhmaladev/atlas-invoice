import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { upsertAttendancePolicy } from '~/server/services/hrAttendancePolicy.service'

const policySchema = z.object({
  siteId: z.string().optional().nullable(),
  name: z.string().optional(),
  timezone: z.string().optional(),
  earlyClockInToleranceMinutes: z.number().int().min(0).optional(),
  lateArrivalToleranceMinutes: z.number().int().min(0).optional(),
  earlyDepartureToleranceMinutes: z.number().int().min(0).optional(),
  maxAllowedBreakMinutes: z.number().int().min(0).optional(),
  maxDailyWorkMinutes: z.number().int().min(0).optional(),
  overtimeThresholdMinutes: z.number().int().min(0).optional(),
  minRestMinutes: z.number().int().min(0).optional(),
  allowUnscheduledClockIn: z.boolean().optional(),
  requireTerminal: z.boolean().optional(),
  requireManagerApproval: z.boolean().optional(),
  enableLocationVerification: z.boolean().optional(),
  autoClockOutPolicy: z.string().optional(),
  gracePeriodMinutes: z.number().int().min(0).optional(),
  paidBreakCountsAsCoverage: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.policy.manage')
  const body = await readBody(event)
  const parsed = policySchema.parse(body)

  return upsertAttendancePolicy(user.tenantId || 'default-tenant', parsed.siteId || null, parsed, user)
})
