import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { attachLeaveDocument } from '~/server/services/hrLeaveAttachment.service'

const schema = z.object({ documentId: z.string().uuid() })

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.self.request')
  const id = getRouterParam(event, 'id')
  if (!id) throw new Error('Identifiant manquant.')
  return attachLeaveDocument(actor.tenantId || 'default-tenant', id, schema.parse(await readBody(event)).documentId, actor)
})
