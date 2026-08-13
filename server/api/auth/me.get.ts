import { defineEventHandler } from 'h3'
import { requireAuth } from '../../utils/auth'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return createSuccessResponse({ user })
})
