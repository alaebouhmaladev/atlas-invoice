import { defineEventHandler } from 'h3'
import { requireSuperAdmin } from '~/server/utils/auth'
import { getCompanySettings } from '~/server/services/companySettings.service'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const settings = await getCompanySettings()
  return {
    success: true,
    data: settings
  }
})
