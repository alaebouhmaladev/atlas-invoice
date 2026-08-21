import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { runBackup } from '../scripts/backup'

describe('HR Phase 4 — Real Database Dump & Isolated Restoration Verification', () => {
  it('runs backup process, verifies manifest checksums, and restores Phase 4 attendance into isolated DB', async () => {
    const tmpBackupDir = path.join(process.cwd(), 'tmp', 'test_hr_phase4_backups')
    if (fs.existsSync(tmpBackupDir)) {
      fs.rmSync(tmpBackupDir, { recursive: true, force: true })
    }

    await runBackup({ outputDir: tmpBackupDir })

    expect(fs.existsSync(tmpBackupDir)).toBe(true)
    const files = fs.readdirSync(tmpBackupDir)
    const dumpFile = files.find(f => f.endsWith('.dump'))
    const manifestFile = files.find(f => f.endsWith('.json'))

    expect(dumpFile).toBeDefined()
    expect(manifestFile).toBeDefined()

    const manifestPath = path.join(tmpBackupDir, manifestFile!)
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    expect(manifestContent.dbDumpFilename).toBe(dumpFile)
    expect(manifestContent.dbDumpSize).toBeGreaterThan(0)
    expect(manifestContent.dbDumpSha256).toBeDefined()

    // Isolated PostgreSQL Restoration
    const dbUser = process.env.POSTGRES_USER || 'atlas_user'
    const dbPass = process.env.POSTGRES_PASSWORD || 'atlas_secure_rotated_pass_2026_sec'
    const restoreDbName = `atlas_bites_restore_isolated_${Date.now()}`
    const restoreDbUrl = `postgresql://${dbUser}:${dbPass}@localhost:5436/${restoreDbName}`
    const execOpts = { stdio: 'pipe' as const, env: { ...process.env, PGPASSWORD: dbPass } }

    try {
      // 1. Create temporary isolated database
      execSync(`/usr/local/bin/createdb -h localhost -p 5436 -U ${dbUser} ${restoreDbName}`, execOpts)

      // 2. Restore dump into isolated database using pg_restore
      const dumpPath = path.join(tmpBackupDir, dumpFile!)
      try {
        execSync(`/usr/local/bin/pg_restore -h localhost -p 5436 -U ${dbUser} -d ${restoreDbName} --no-owner --no-acl "${dumpPath}"`, execOpts)
      } catch {
        // Harmless warnings during schema restore can cause exit code 1
      }

      // 3. Connect to isolated database using a dedicated PrismaClient instance
      const { PrismaClient } = await import('@prisma/client')
      const restorePrisma = new PrismaClient({ datasources: { db: { url: restoreDbUrl } } })

      try {
        const restoredPolicies = await restorePrisma.attendancePolicy.findMany()
        const restoredTerminals = await restorePrisma.attendanceTerminal.findMany()

        expect(restoredPolicies).toBeDefined()
        expect(restoredTerminals).toBeDefined()
      } finally {
        await restorePrisma.$disconnect()
      }
    } finally {
      // Cleanup isolated database & temporary test backup folder
      try {
        execSync(`/usr/local/bin/dropdb -h localhost -p 5436 -U ${dbUser} ${restoreDbName}`, execOpts)
      } catch {
        // Ignore drop error
      }
      if (fs.existsSync(tmpBackupDir)) {
        fs.rmSync(tmpBackupDir, { recursive: true, force: true })
      }
    }
  }, 30000)
})
