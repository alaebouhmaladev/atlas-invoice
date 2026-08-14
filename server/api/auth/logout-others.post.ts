import { defineEventHandler } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { logoutOtherSessions } from '~/server/services/userManagement.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const currentSessionId = event.context.session?.id || ''
  const result = await logoutOtherSessions(user.id, currentSessionId)
  return {
    success: true,
    data: result
  }
})
