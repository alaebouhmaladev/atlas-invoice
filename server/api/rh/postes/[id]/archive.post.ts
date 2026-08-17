import { requireHrPermission } from '~/server/utils/hrPermissions'
import { archivePosition } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_positions')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })
  const body = await readBody(event)

  const pos = await archivePosition(id, body, actor)
  return { success: true, data: pos }
})
