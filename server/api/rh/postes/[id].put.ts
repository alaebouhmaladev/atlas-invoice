import { requireHrPermission } from '~/server/utils/hrPermissions'
import { updatePosition } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_positions')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })
  const body = await readBody(event)

  const pos = await updatePosition(id, body, actor)
  return { success: true, data: pos }
})
