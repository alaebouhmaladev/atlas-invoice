import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { listUserSessions } from '~/server/services/userManagement.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const currentSessionId = event.context.session?.id || ''
  const sessions = await listUserSessions(user.id)

  const data = sessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrent: s.id === currentSessionId
  }))

  return {
    success: true,
    data
  }
})
