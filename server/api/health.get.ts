import { defineEventHandler, setResponseStatus } from 'h3'
import { prisma } from '../utils/db'
import { createSuccessResponse, createErrorResponse } from '../utils/response'

export default defineEventHandler(async (event) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return createSuccessResponse({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch {
    setResponseStatus(event, 500)
    return createErrorResponse(
      'HEALTH_CHECK_FAILED',
      'Le contrôle de disponibilité de la base de données a échoué'
    )
  }
})
