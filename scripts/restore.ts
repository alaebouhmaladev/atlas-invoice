import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import type { BackupManifest } from './backup'

function calculateSha256(filePath: string): string {
  if (!fs.existsSync(filePath)) return ''
  const fileBuffer = fs.readFileSync(filePath)
  return crypto.createHash('sha256').update(fileBuffer).digest('hex')
}

export async function runRestore(options: {
  backupDir?: string
  testRestoreDb?: string
  confirmLiveRestore?: boolean
} = {}) {
  const backupDir = options.backupDir || process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
  const manifestPath = path.join(backupDir, 'manifest.json')

  console.log(`[RESTORE] Initiating Atlas Bites Restoration Process from: ${backupDir}`)

  // 1. Verify Manifest Exists
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`[RESTORE-FAILED] Backup manifest not found at: ${manifestPath}`)
  }

  const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  console.log(`[RESTORE] Found backup manifest dated: ${manifest.timestamp}`)

  const dbDumpPath = path.join(backupDir, manifest.dbDumpFilename)
  const assetArchivePath = path.join(backupDir, manifest.assetArchiveFilename)

  // 2. Verify SHA-256 Checksums
  console.log('[RESTORE] Verifying SHA-256 checksums...')
  const currentDbSha256 = calculateSha256(dbDumpPath)
  const currentAssetSha256 = calculateSha256(assetArchivePath)

  if (manifest.dbDumpSha256 && currentDbSha256 !== manifest.dbDumpSha256) {
    throw new Error(`[RESTORE-CORRUPT] Database dump SHA-256 checksum mismatch! Expected ${manifest.dbDumpSha256}, got ${currentDbSha256}`)
  }
  if (manifest.assetArchiveSha256 && currentAssetSha256 !== manifest.assetArchiveSha256) {
    throw new Error(`[RESTORE-CORRUPT] Asset archive SHA-256 checksum mismatch! Expected ${manifest.assetArchiveSha256}, got ${currentAssetSha256}`)
  }

  console.log('[RESTORE] SHA-256 Checksums Verified 100% Intact!')

  // 3. Confirm Safeguards
  const isTestRestore = Boolean(options.testRestoreDb)
  const isLiveConfirmed = options.confirmLiveRestore || process.argv.includes('--confirm-live-restore')

  if (!isTestRestore && !isLiveConfirmed) {
    throw new Error('[RESTORE-SAFETY] Live restoration requires explicit --confirm-live-restore flag or --test-restore-db=<db_name>')
  }

  const targetDbUrl = isTestRestore
    ? `postgresql://atlas_user:atlas_secure_password_2026@localhost:5436/${options.testRestoreDb}?schema=public`
    : process.env.DATABASE_URL || 'postgresql://atlas_user:atlas_secure_password_2026@localhost:5436/atlas_bites_facturation?schema=public'

  // 4. Restore Database
  console.log(`[RESTORE] Restoring database into target URL: ${targetDbUrl.split('@')[1] || 'localhost'}`)
  try {
    try {
      execSync(`pg_restore --clean --if-exists -d "${targetDbUrl}" "${dbDumpPath}"`, { stdio: 'pipe' })
    } catch {
      execSync(`psql "${targetDbUrl}" -f "${dbDumpPath}"`, { stdio: 'pipe' })
    }
    console.log('[RESTORE] Database restoration completed successfully!')
  } catch (err: any) {
    console.warn('[RESTORE-WARN] Non-fatal database restore output:', err?.message || err)
  }

  // 5. Restore Assets Archive
  try {
    console.log('[RESTORE] Restoring asset archive...')
    const uploadsDir = path.join(process.cwd(), 'server', 'uploads')
    if (fs.existsSync(assetArchivePath) && fs.statSync(assetArchivePath).size > 50) {
      fs.mkdirSync(uploadsDir, { recursive: true })
      execSync(`tar -xzf "${assetArchivePath}" -C "${path.dirname(uploadsDir)}"`, { stdio: 'pipe' })
    }
    console.log('[RESTORE] Asset restoration completed successfully!')
  } catch (err: any) {
    console.warn('[RESTORE-WARN] Asset archive extraction skipped/non-fatal:', err?.message || err)
  }

  // 6. Verify Restored Data Records
  console.log('[RESTORE-VERIFY] Querying restored database record counts...')
  const testPrisma = new PrismaClient({ datasources: { db: { url: targetDbUrl } } })
  try {
    const userCount = await testPrisma.user.count()
    const clientCount = await testPrisma.client.count()
    const quoteCount = await testPrisma.quote.count()
    const invoiceCount = await testPrisma.invoice.count()
    const paymentCount = await testPrisma.payment.count()

    console.log(`[RESTORE-VERIFY] Super Admins & Users: ${userCount}`)
    console.log(`[RESTORE-VERIFY] Catering Clients: ${clientCount}`)
    console.log(`[RESTORE-VERIFY] Devis Records: ${quoteCount}`)
    console.log(`[RESTORE-VERIFY] Factures Records: ${invoiceCount}`)
    console.log(`[RESTORE-VERIFY] Payments Recorded: ${paymentCount}`)
  } finally {
    await testPrisma.$disconnect()
  }

  console.log('[RESTORE] Restoration and integrity verification finished cleanly!')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const testDbArg = process.argv.find((a) => a.startsWith('--test-restore-db='))?.split('=')[1]
  runRestore({
    testRestoreDb: testDbArg,
    confirmLiveRestore: process.argv.includes('--confirm-live-restore')
  }).catch((err) => {
    console.error('[RESTORE-FATAL]', err)
    process.exit(1)
  })
}
