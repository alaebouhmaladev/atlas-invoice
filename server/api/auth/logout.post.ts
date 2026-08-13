import { defineEventHandler, getRequestIP, getRequestHeader } from 'h3'
import { invalidateSession } from '../../services/auth.service'
import { getSessionTokenCookie, deleteSessionTokenCookie, getUserFromEvent } from '../../utils/auth'
import { createAuditLog } from '../../services/audit.service'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await getUserFromEvent(event)
  const token = getSessionTokenCookie(event)
  const ipAddress = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const userAgent = getRequestHeader(event, 'user-agent')

  if (token) {
    await invalidateSession(token)
  }

  deleteSessionTokenCookie(event)

  if (user) {
    await createAuditLog({
      userId: user.id,
      action: 'AUTH_LOGOUT',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email },
      ipAddress,
      userAgent
    })
  }

  return createSuccessResponse({ message: 'Successfully logged out' })
})
