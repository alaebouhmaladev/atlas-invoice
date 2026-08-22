import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { reviewLeaveCancellation } from '~/server/services/hrLeaveApproval.service'

const schema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().min(5).max(1000),
  confirmation: z.string()
}).superRefine((value, context) => {
  if (value.decision === 'APPROVED' && value.confirmation !== 'ANNULER LE CONGÉ') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmation'], message: 'Saisissez « ANNULER LE CONGÉ » pour confirmer.' })
  }
})

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.cancel')
  const id = getRouterParam(event, 'id')
  if (!id) throw new Error('Identifiant manquant.')
  const body = schema.parse(await readBody(event))
  return reviewLeaveCancellation(actor.tenantId || 'default-tenant', id, body.decision, body.reason, actor)
})
