import { defineEventHandler, getRouterParam } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { markNotificationAsRead } from '~/server/services/notification.service'
import { createSuccessResponse } from '~/server/utils/response'
import { createSanitizedError } from '~/server/utils/error'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createSanitizedError(event, 400, 'VALIDATION_ERROR', 'ID de notification requis')
  }

  const updated = await markNotificationAsRead(id, user.id, user.role)

  if (!updated) {
    throw createSanitizedError(event, 440, 'NOT_FOUND', 'Notification non trouvée ou non autorisée')
  }

  return createSuccessResponse({ success: true, notification: updated })
})
