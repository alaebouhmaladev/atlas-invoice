import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { prisma } from '../server/utils/db'
import { runBackup } from '../scripts/backup'

describe('HR Phase 5 — isolated backup and restore', () => {
  it('restores leave configuration and immutable ledger tables into an isolated database', async () => {
    const stamp = Date.now()
    const tenantId = `phase5-backup-${stamp}`
    const user = await prisma.user.create({ data: { tenantId, name: 'Phase 5 Backup', email: `phase5-backup-${stamp}@atlas.ma`, passwordHash: 'hash', role: 'SUPER_ADMIN' } })
    await prisma.leaveType.create({ data: { tenantId, code: `P5-BACKUP-${stamp}`, name: 'Preuve restauration Phase 5', category: 'PAID', createdById: user.id } })

    const backupDir = path.join(process.cwd(), 'tmp', `test_hr_phase5_backups_${stamp}`)
    const dbUser = process.env.POSTGRES_USER || 'atlas_user'
    const dbPass = process.env.POSTGRES_PASSWORD || 'atlas_secure_rotated_pass_2026_sec'
    const restoreDbName = `atlas_bites_restore_phase5_${stamp}`
    const restoreDbUrl = `postgresql://${dbUser}:${dbPass}@localhost:5436/${restoreDbName}`
    const execOptions = { stdio: 'pipe' as const, env: { ...process.env, PGPASSWORD: dbPass } }

    try {
      const manifest = await runBackup({ outputDir: backupDir })
      expect(manifest?.success).toBe(true)
      execSync(`/usr/local/bin/createdb -h localhost -p 5436 -U ${dbUser} ${restoreDbName}`, execOptions)
      try {
        execSync(`/usr/local/bin/pg_restore -h localhost -p 5436 -U ${dbUser} -d ${restoreDbName} --no-owner --no-acl "${path.join(backupDir, manifest!.dbDumpFilename)}"`, execOptions)
      } catch {
        // pg_restore can return warnings while still restoring all records.
      }
      const restored = new PrismaClient({ datasources: { db: { url: restoreDbUrl } } })
      try {
        const leaveType = await restored.leaveType.findFirst({ where: { tenantId, code: `P5-BACKUP-${stamp}` } })
        expect(leaveType?.name).toBe('Preuve restauration Phase 5')
        expect(await restored.leaveBalanceEntry.count({ where: { tenantId } })).toBe(0)
      } finally {
        await restored.$disconnect()
      }
    } finally {
      try { execSync(`/usr/local/bin/dropdb -h localhost -p 5436 -U ${dbUser} ${restoreDbName}`, execOptions) } catch { /* isolated DB may not exist */ }
      await prisma.leaveType.deleteMany({ where: { tenantId } })
      await prisma.auditLog.deleteMany({ where: { userId: user.id } })
      await prisma.user.deleteMany({ where: { tenantId } })
      if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true })
    }
  }, 30000)
})
