import { defineEventHandler, getQuery } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { getEmployees } from '../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.list')
  const query = getQuery(event)

  const result = await getEmployees(
    {
      page: query.page ? parseInt(String(query.page), 10) : undefined,
      pageSize: query.pageSize ? parseInt(String(query.pageSize), 10) : undefined,
      search: query.search ? String(query.search) : undefined,
      status: query.status ? String(query.status) : undefined,
      includeArchived: query.includeArchived === 'true',
      linkedStatus: query.linkedStatus ? String(query.linkedStatus) : undefined,
      sortBy: query.sortBy ? String(query.sortBy) : undefined,
      sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc'
    },
    user
  )

  return {
    success: true,
    data: result.data,
    pagination: result.pagination
  }
})
