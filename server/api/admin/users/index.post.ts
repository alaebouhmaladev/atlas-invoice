import { defineEventHandler, readBody } from 'h3'
import { requireSuperAdmin } from '~/server/utils/auth'
import { createUser } from '~/server/services/userManagement.service'

export default defineEventHandler(async (event) => {
  const actor = await requireSuperAdmin(event)
  const body = await readBody(event)
  const user = await createUser(body, actor.id)
  return {
    success: true,
    data: user
  }
})
