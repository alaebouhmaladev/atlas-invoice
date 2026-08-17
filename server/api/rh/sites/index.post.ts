import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createSite } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_sites')
  const body = await readBody(event)

  const site = await createSite(body, actor)
  return { success: true, data: site }
})
