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
  } catch (error: unknown) {
    setResponseStatus(event, 500)
    const message = error instanceof Error ? error.message : String(error)
    return createErrorResponse('HEALTH_CHECK_FAILED', 'Database health check failed', message)
  }
})
