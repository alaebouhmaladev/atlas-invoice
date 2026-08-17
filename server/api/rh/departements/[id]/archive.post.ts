import { requireHrPermission } from '~/server/utils/hrPermissions'
import { archiveDepartment } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_departments')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })
  const body = await readBody(event)

  const dept = await archiveDepartment(id, body, actor)
  return { success: true, data: dept }
})
