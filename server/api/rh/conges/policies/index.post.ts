import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createLeavePolicy } from '~/server/services/hrLeaveConfiguration.service'

const schema = z.object({
  leaveTypeId: z.string().uuid(),
  siteId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  contractType: z.enum(['CDI', 'CDD', 'TEMPORARY', 'INTERNSHIP', 'PART_TIME', 'OTHER']).optional().nullable(),
  name: z.string().min(2).max(120),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  entitlementMinutes: z.number().int().nonnegative().optional(),
  accrualMinutes: z.number().int().nonnegative().optional(),
  accrualFrequency: z.string().max(30).optional(),
  minutesPerDay: z.number().int().positive(),
  workingWeekdays: z.array(z.number().int().min(0).max(6)).max(7),
  excludeHolidays: z.boolean().optional(),
  carryOverLimitMinutes: z.number().int().nonnegative().optional().nullable(),
  carryOverExpiryMonth: z.number().int().min(1).max(12).optional().nullable(),
  allowNegativeBalance: z.boolean().optional(),
  maximumNegativeMinutes: z.number().int().nonnegative().optional(),
  attachmentThresholdMinutes: z.number().int().positive().optional().nullable(),
  approvalWorkflow: z.enum(['MANAGER_ONLY', 'HR_ONLY', 'MANAGER_THEN_HR', 'AUTOMATIC']).optional(),
  blockOnCoverageWarning: z.boolean().optional(),
  priority: z.number().int().min(-1000).max(1000).optional(),
  allowDuringProbation: z.boolean().optional(),
  allowRetroactiveRequests: z.boolean().optional()
})

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.manage_policies')
  return createLeavePolicy(schema.parse(await readBody(event)), actor)
})
