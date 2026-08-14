import fs from 'node:fs'
import path from 'node:path'
import { defineEventHandler, setResponseStatus } from 'h3'
import { prisma } from '../../utils/db'
import { createSuccessResponse, createErrorResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  let isDbReady = false
  let isStorageReady = false
  const details: Record<string, string> = {}

  // 1. Check PostgreSQL Database Connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    isDbReady = true
    details.database = 'connected'
  } catch (err: unknown) {
    details.database = err instanceof Error ? err.message : String(err)
  }

  // 2. Check Persistent Storage Accessibility
  try {
    const uploadsDir = path.join(process.cwd(), 'server', 'uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    const testFile = path.join(uploadsDir, '.healthcheck_test')
    fs.writeFileSync(testFile, 'ok')
    fs.unlinkSync(testFile)
    isStorageReady = true
    details.storage = 'accessible'
  } catch (err: unknown) {
    details.storage = err instanceof Error ? err.message : String(err)
  }

  const isReady = isDbReady && isStorageReady

  if (!isReady) {
    setResponseStatus(event, 503)
    return createErrorResponse('NOT_READY', 'Application is not ready to serve traffic', JSON.stringify(details))
  }

  return createSuccessResponse({
    status: 'ready',
    database: 'connected',
    storage: 'accessible',
    timestamp: new Date().toISOString()
  })
})
