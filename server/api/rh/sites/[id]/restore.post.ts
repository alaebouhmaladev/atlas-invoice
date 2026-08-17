import { requireHrPermission } from '~/server/utils/hrPermissions'
import { restoreSite } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_sites')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const site = await restoreSite(id, actor)
  return { success: true, data: site }
})
