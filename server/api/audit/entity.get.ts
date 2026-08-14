import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { getAuditLogs } from '~/server/services/audit.service'
import { createSuccessResponse } from '~/server/utils/response'
import { createSanitizedError } from '~/server/utils/error'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const query = getQuery(event)

  const entityType = query.entityType as string | undefined
  const entityId = query.entityId as string | undefined

  if (!entityType || !entityId) {
    throw createSanitizedError(event, 400, 'VALIDATION_ERROR', 'entityType et entityId requis')
  }

  const result = await getAuditLogs({
    entityType,
    entityId,
    limit: 20
  })

  return createSuccessResponse(result)
})
