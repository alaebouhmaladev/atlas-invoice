import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { getNotificationsForUser } from '~/server/services/notification.service'
import { createSuccessResponse } from '~/server/utils/response'
import type { NotificationSeverity } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const isReadParam = query.isRead !== undefined ? query.isRead === 'true' : undefined
  const severityParam = query.severity as NotificationSeverity | undefined
  const limitParam = query.limit ? parseInt(query.limit as string, 10) : undefined
  const pageParam = query.page ? parseInt(query.page as string, 10) : undefined

  const result = await getNotificationsForUser({
    userId: user.id,
    userRole: user.role,
    isRead: isReadParam,
    severity: severityParam,
    limit: limitParam,
    page: pageParam
  })

  return createSuccessResponse(result)
})
