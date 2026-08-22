import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { hasHrPermission, requireHrPermission } from '~/server/utils/hrPermissions'
import { reviewLeaveRequest } from '~/server/services/hrLeaveApproval.service'

const schema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  privateNote: z.string().max(2000).optional(),
  expectedVersion: z.number().int().positive().optional(),
  idempotencyKey: z.string().min(8).max(120).optional(),
  confirmation: z.string().optional()
}).superRefine((value, context) => {
  if (value.decision === 'APPROVED' && value.confirmation !== 'APPROUVER LE CONGÉ') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmation'], message: 'Saisissez « APPROUVER LE CONGÉ » pour confirmer.' })
  }
})

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.self.read')
  if (!hasHrPermission(actor, 'hr.leave.review_manager') && !hasHrPermission(actor, 'hr.leave.review_hr')) {
    throw createError({ statusCode: 403, statusMessage: 'Vous ne pouvez pas traiter cette validation.' })
  }
  const id = getRouterParam(event, 'id')
  if (!id) throw new Error('Identifiant manquant.')
  const body = schema.parse(await readBody(event))
  return reviewLeaveRequest(actor.tenantId || 'default-tenant', id, body.decision, body.privateNote, actor, { expectedVersion: body.expectedVersion, idempotencyKey: body.idempotencyKey })
})
