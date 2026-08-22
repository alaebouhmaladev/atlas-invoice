import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { submitDraftLeaveRequest } from '~/server/services/hrLeaveRequest.service'

const schema = z.object({ expectedVersion: z.number().int().positive().optional() })

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.self.request')
  const id = getRouterParam(event, 'id')
  if (!id) throw new Error('Identifiant manquant.')
  const body = schema.parse(await readBody(event))
  return submitDraftLeaveRequest(actor.tenantId || 'default-tenant', id, actor, body.expectedVersion)
})
