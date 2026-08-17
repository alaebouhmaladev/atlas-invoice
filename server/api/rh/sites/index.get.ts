import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getSites } from '~/server/services/hrOrganization.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.organization.manage_sites')
  const query = getQuery(event)

  const result = await getSites({
    search: query.search as string,
    type: query.type as any,
    isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
    isArchived: query.isArchived !== undefined ? query.isArchived === 'true' : undefined,
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 20
  }, actor)

  return { success: true, ...result }
})
