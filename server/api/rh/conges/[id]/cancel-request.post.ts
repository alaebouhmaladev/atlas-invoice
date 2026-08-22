import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { requestLeaveCancellation } from '~/server/services/hrLeaveRequest.service'

const schema = z.object({ reason: z.string().min(5).max(1000), confirmation: z.literal('ANNULER LE CONGÉ') })

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.self.request')
  const id = getRouterParam(event, 'id')
  if (!id) throw new Error('Identifiant manquant.')
  return requestLeaveCancellation(actor.tenantId || 'default-tenant', id, schema.parse(await readBody(event)).reason, actor)
})
