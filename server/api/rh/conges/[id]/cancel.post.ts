import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { cancelLeaveRequest } from '~/server/services/hrLeaveApproval.service'

const schema = z.object({ reason: z.string().min(5).max(2000) })

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.cancel')
  const id = getRouterParam(event, 'id')
  if (!id) throw new Error('Identifiant manquant.')
  const body = schema.parse(await readBody(event))
  return cancelLeaveRequest(actor.tenantId || 'default-tenant', id, body.reason, actor)
})
