import { defineEventHandler, getRouterParam } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { listLeaveAttachments } from '~/server/services/hrLeaveAttachment.service'

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.self.read')
  const id = getRouterParam(event, 'id')
  if (!id) throw new Error('Identifiant manquant.')
  return listLeaveAttachments(actor.tenantId || 'default-tenant', id, actor)
})
