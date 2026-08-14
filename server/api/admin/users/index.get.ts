import { defineEventHandler } from 'h3'
import { requireSuperAdmin } from '~/server/utils/auth'
import { listUsers } from '~/server/services/userManagement.service'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const users = await listUsers()
  return {
    success: true,
    data: users
  }
})
