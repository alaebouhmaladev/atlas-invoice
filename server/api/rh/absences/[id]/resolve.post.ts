import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { resolveAbsence } from '~/server/services/hrAbsence.service'

const schema = z.object({
  status: z.enum(['JUSTIFIED', 'RESOLVED']),
  privateResolutionNote: z.string().min(5).max(2000),
  documentId: z.string().uuid().optional().nullable()
})

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.absence.resolve')
  const id = getRouterParam(event, 'id')
  if (!id) throw new Error('Identifiant manquant.')
  return resolveAbsence(actor.tenantId || 'default-tenant', id, schema.parse(await readBody(event)), actor)
})
