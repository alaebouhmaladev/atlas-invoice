import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createDepartment } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_departments')
  const body = await readBody(event)

  const dept = await createDepartment(body, actor)
  return { success: true, data: dept }
})
