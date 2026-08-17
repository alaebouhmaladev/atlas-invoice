import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getContracts } from '~/server/services/hrContract.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.contract.read')
  const query = getQuery(event)

  const result = await getContracts({
    employeeId: query.employeeId as string,
    siteId: query.siteId as string,
    status: query.status as any,
    contractType: query.contractType as any,
    expiringInDays: query.expiringInDays ? Number(query.expiringInDays) : undefined,
    search: query.search as string,
    page: query.page ? Number(query.page) : 1,
    limit: query.limit ? Number(query.limit) : 20
  }, actor)

  return { success: true, ...result }
})
