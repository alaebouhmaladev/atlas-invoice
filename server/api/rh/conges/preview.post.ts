import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { previewLeaveDuration } from '~/server/services/hrLeaveDuration.service'

const schema = z.object({ employeeId: z.string().uuid(), leaveTypeId: z.string().uuid(), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startPortion: z.enum(['FULL_DAY', 'MORNING', 'AFTERNOON', 'CUSTOM']).optional(), endPortion: z.enum(['FULL_DAY', 'MORNING', 'AFTERNOON', 'CUSTOM']).optional(), customStartMinute: z.number().int().min(0).max(1439).optional().nullable(), customEndMinute: z.number().int().min(1).max(1440).optional().nullable() })

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.self.request')
  return previewLeaveDuration(actor.tenantId || 'default-tenant', schema.parse(await readBody(event)), actor)
})
