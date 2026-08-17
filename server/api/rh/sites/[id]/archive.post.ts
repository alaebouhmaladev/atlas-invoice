import { requireHrPermission } from '~/server/utils/hrPermissions'
import { archiveSite } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_sites')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })
  const body = await readBody(event)

  const site = await archiveSite(id, body, actor)
  return { success: true, data: site }
})
