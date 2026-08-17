import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getDocuments } from '~/server/services/hrDocument.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.document.read')
  const query = getQuery(event)

  const result = await getDocuments({
    employeeId: query.employeeId as string,
    contractId: query.contractId as string,
    category: query.category as any,
    expiringInDays: query.expiringInDays ? Number(query.expiringInDays) : undefined,
    search: query.search as string,
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 20
  }, actor)

  return { success: true, ...result }
})
