import { defineEventHandler, readBody } from 'h3'
import { requireAuth } from '~/server/utils/auth'
import { changeOwnPassword } from '~/server/services/userManagement.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const sessionId = event.context.session?.id || ''
  const result = await changeOwnPassword(user.id, sessionId, body)
  return {
    success: true,
    data: result
  }
})
