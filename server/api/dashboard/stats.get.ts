import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAuth } from '../../utils/auth'
import { getDashboardStats } from '../../services/dashboard.service'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)

  const period = typeof query.period === 'string' ? query.period : '30d'
  const startDate = typeof query.startDate === 'string' ? query.startDate : undefined
  const endDate = typeof query.endDate === 'string' ? query.endDate : undefined

  try {
    const stats = await getDashboardStats({
      period,
      startDate,
      endDate,
      userRole: user.role
    })

    return createSuccessResponse(stats)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve dashboard metrics: ' + message
    })
  }
})
