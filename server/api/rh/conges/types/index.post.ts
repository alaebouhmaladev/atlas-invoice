import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createLeaveType } from '~/server/services/hrLeaveConfiguration.service'

const schema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  category: z.enum(['PAID', 'UNPAID', 'SICK', 'AUTHORIZED_OTHER']),
  isPaid: z.boolean().optional(),
  usesBalance: z.boolean().optional(),
  requiresDocument: z.boolean().optional(),
  allowPartialDay: z.boolean().optional(),
  allowHourly: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  minimumNoticeDays: z.number().int().nonnegative().optional().nullable(),
  maximumConsecutiveDays: z.number().int().positive().optional().nullable()
})

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.manage_types')
  return createLeaveType(schema.parse(await readBody(event)), actor)
})
