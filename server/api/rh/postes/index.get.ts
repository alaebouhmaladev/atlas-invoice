import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getPositions } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_positions')
  const query = getQuery(event)

  const result = await getPositions({
    departmentId: query.departmentId as string,
    search: query.search as string,
    isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
    isArchived: query.isArchived !== undefined ? query.isArchived === 'true' : undefined,
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 20
  }, actor)

  return { success: true, ...result }
})
