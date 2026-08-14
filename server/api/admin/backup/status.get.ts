import fs from 'node:fs'
import path from 'node:path'
import { defineEventHandler, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { createSuccessResponse } from '../../../utils/response'
import type { BackupManifest } from '../../../../scripts/backup'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (user.role !== 'SUPER_ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès réservé au Super Administrateur'
    })
  }

  const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
  const manifestPath = path.join(backupDir, 'manifest.json')

  if (!fs.existsSync(manifestPath)) {
    return createSuccessResponse({
      hasBackup: false,
      status: 'NONE',
      message: 'Aucune sauvegarde enregistrée'
    })
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest: BackupManifest = JSON.parse(raw)

    const backupTime = new Date(manifest.timestamp).getTime()
    const ageHours = (Date.now() - backupTime) / (1000 * 60 * 60)

    let status: 'HEALTHY' | 'WARNING' | 'FAILED' = 'HEALTHY'
    if (!manifest.success) {
      status = 'FAILED'
    } else if (ageHours > 48) {
      status = 'WARNING'
    }

    return createSuccessResponse({
      hasBackup: true,
      status,
      timestamp: manifest.timestamp,
      ageHours: Math.round(ageHours),
      dbDumpFilename: manifest.dbDumpFilename,
      dbDumpSize: manifest.dbDumpSize,
      assetArchiveFilename: manifest.assetArchiveFilename,
      assetArchiveSize: manifest.assetArchiveSize,
      dbDumpSha256: manifest.dbDumpSha256,
      assetArchiveSha256: manifest.assetArchiveSha256,
      appVersion: manifest.appVersion,
      postgresVersion: manifest.postgresVersion
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return createSuccessResponse({
      hasBackup: true,
      status: 'FAILED',
      error: message
    })
  }
})
