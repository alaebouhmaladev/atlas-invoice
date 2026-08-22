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
  } catch {
    details.database = 'indisponible'
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
  } catch {
    details.storage = 'indisponible'
  }

  const isReady = isDbReady && isStorageReady

  if (!isReady) {
    setResponseStatus(event, 503)
    return createErrorResponse(
      'NOT_READY',
      'L’application n’est pas prête à recevoir du trafic',
      details
    )
  }

  return createSuccessResponse({
    status: 'ready',
    database: 'connected',
    storage: 'accessible',
    timestamp: new Date().toISOString()
  })
})
