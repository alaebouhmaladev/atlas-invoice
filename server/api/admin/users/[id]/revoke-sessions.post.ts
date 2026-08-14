import { defineEventHandler, getRouterParam } from 'h3'
import { requireSuperAdmin } from '~/server/utils/auth'
import { prisma } from '~/server/utils/db'
import { createAuditEntry } from '~/server/services/audit.service'
import { createSuccessResponse } from '~/server/utils/response'
import { createSanitizedError } from '~/server/utils/error'

export default defineEventHandler(async (event) => {
  const actor = await requireSuperAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createSanitizedError(event, 400, 'VALIDATION_ERROR', 'ID utilisateur requis')
  }

  const targetUser = await prisma.user.findUnique({ where: { id } })
  if (!targetUser) {
    throw createSanitizedError(event, 404, 'NOT_FOUND', 'Utilisateur introuvable')
  }

  const result = await prisma.session.deleteMany({
    where: { userId: id }
  })

  await createAuditEntry({
    userId: actor.id,
    actorDisplayNameSnapshot: actor.name,
    actorRoleSnapshot: actor.role,
    action: 'SESSION_REVOKED',
    category: 'AUTH',
    result: 'SUCCESS',
    entityType: 'User',
    entityId: id,
    entityReference: targetUser.email,
    metadata: {
      revokedCount: result.count,
      targetEmail: targetUser.email
    },
    event
  })

  return createSuccessResponse({
    success: true,
    revokedCount: result.count
  })
})
