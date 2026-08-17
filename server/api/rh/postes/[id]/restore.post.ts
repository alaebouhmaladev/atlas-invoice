import { requireHrPermission } from '~/server/utils/hrPermissions'
import { restorePosition } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_positions')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const pos = await restorePosition(id, actor)
  return { success: true, data: pos }
})
