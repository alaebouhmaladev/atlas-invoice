import { defineEventHandler, getQuery } from 'h3'
import { requireSuperAdmin } from '~/server/utils/auth'
import { getAuditLogs } from '~/server/services/audit.service'
import { createSuccessResponse } from '~/server/utils/response'
import type { Role } from '@prisma/client'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const query = getQuery(event)

  const startDate = query.startDate as string | undefined
  const endDate = query.endDate as string | undefined
  const userId = query.userId as string | undefined
  const role = query.role as Role | undefined
  const action = query.action as string | undefined
  const category = query.category as string | undefined
  const entityType = query.entityType as string | undefined
  const entityId = query.entityId as string | undefined
  const resultParam = query.result as string | undefined
  const search = query.search as string | undefined
  const page = query.page ? parseInt(query.page as string, 10) : 1
  const limit = query.limit ? parseInt(query.limit as string, 10) : 20

  const result = await getAuditLogs({
    startDate,
    endDate,
    userId,
    role,
    action,
    category,
    entityType,
    entityId,
    result: resultParam,
    search,
    page,
    limit
  })

  return createSuccessResponse(result)
})
