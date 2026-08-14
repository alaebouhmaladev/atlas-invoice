import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { markAllNotificationsAsRead } from '~/server/services/notification.service'
import { createSuccessResponse } from '~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  await markAllNotificationsAsRead(user.id, user.role)
  return createSuccessResponse({ success: true })
})
