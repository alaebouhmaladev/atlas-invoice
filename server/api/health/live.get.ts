import { defineEventHandler } from 'h3'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(() => {
  return createSuccessResponse({
    status: 'ok',
    liveness: 'healthy',
    timestamp: new Date().toISOString()
  })
})
