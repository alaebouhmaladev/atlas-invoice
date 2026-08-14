import { defineEventHandler } from 'h3'
import { requireHrPermission } from '../../utils/hrPermissions'
import { getHrOverviewMetrics } from '../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.list')
  const metrics = await getHrOverviewMetrics(user)
  return {
    success: true,
    data: metrics
  }
})
