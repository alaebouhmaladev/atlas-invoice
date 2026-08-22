import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createLeaveRequest } from '~/server/services/hrLeaveRequest.service'

const schema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startPortion: z.enum(['FULL_DAY', 'MORNING', 'AFTERNOON', 'CUSTOM']).optional(),
  endPortion: z.enum(['FULL_DAY', 'MORNING', 'AFTERNOON', 'CUSTOM']).optional(),
  privateReason: z.string().max(2000).optional().nullable(),
  documentId: z.string().uuid().optional().nullable()
  , customStartMinute: z.number().int().min(0).max(1439).optional().nullable()
  , customEndMinute: z.number().int().min(1).max(1440).optional().nullable()
  , emergencyContact: z.string().max(200).optional().nullable()
  , idempotencyKey: z.string().min(8).max(120).optional().nullable()
  , saveAsDraft: z.boolean().optional()
})

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.self.request')
  return createLeaveRequest(schema.parse(await readBody(event)), actor)
})
