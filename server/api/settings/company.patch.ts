import { defineEventHandler, readBody } from 'h3'
import { requireSuperAdmin } from '~/server/utils/auth'
import { updateCompanySettings } from '~/server/services/companySettings.service'

export default defineEventHandler(async (event) => {
  const user = await requireSuperAdmin(event)
  const body = await readBody(event)
  const updated = await updateCompanySettings(body, user.id)
  return {
    success: true,
    data: updated
  }
})
