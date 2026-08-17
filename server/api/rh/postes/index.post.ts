import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createPosition } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_positions')
  const body = await readBody(event)

  const pos = await createPosition(body, actor)
  return { success: true, data: pos }
})
