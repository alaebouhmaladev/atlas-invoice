import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { adjustLeaveBalance } from '~/server/services/hrLeaveBalance.service'

const schema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountMinutes: z.number().int().refine(value => value !== 0),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(5).max(500),
  idempotencyKey: z.string().max(120).optional().nullable(),
  confirmation: z.literal('AJUSTER LE SOLDE')
})

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.balance.adjust')
  return adjustLeaveBalance(actor.tenantId || 'default-tenant', schema.parse(await readBody(event)), actor)
})
