import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { prisma } from '../server/utils/db'
import { runBackup } from '../scripts/backup'

describe('HR Phase 6 — sauvegarde et restauration isolée', () => {
  it('restaure la configuration de paie et les composants sans toucher la base source', async () => {
    const stamp = Date.now()
    const tenantId = `phase6-backup-${stamp}`
    const configuration = await prisma.payrollConfiguration.create({ data: { tenantId, name: `Configuration ${stamp}`, effectiveFrom: new Date('2097-01-01T00:00:00Z'), createdById: 'phase6-backup-test' } })
    const component = await prisma.salaryComponentDefinition.create({ data: { tenantId, code: `P6-${stamp}`, name: 'Composant restauration Phase 6', kind: 'EARNING', mode: 'FIXED', effectiveFrom: new Date('2097-01-01T00:00:00Z'), createdById: 'phase6-backup-test' } })
    const backupDir = path.join(process.cwd(), 'tmp', `test_hr_phase6_backups_${stamp}`)
    const dbUser = process.env.POSTGRES_USER || 'atlas_user'
    const dbPass = process.env.POSTGRES_PASSWORD || 'atlas_secure_rotated_pass_2026_sec'
    const restoreDbName = `atlas_bites_restore_phase6_${stamp}`
    const restoreDbUrl = `postgresql://${dbUser}:${dbPass}@localhost:5436/${restoreDbName}`
    const execOptions = { stdio: 'pipe' as const, env: { ...process.env, PGPASSWORD: dbPass } }
    try {
      const manifest = await runBackup({ outputDir: backupDir })
      expect(manifest?.success).toBe(true)
      execSync(`/usr/local/bin/createdb -h localhost -p 5436 -U ${dbUser} ${restoreDbName}`, execOptions)
      try { execSync(`/usr/local/bin/pg_restore -h localhost -p 5436 -U ${dbUser} -d ${restoreDbName} --no-owner --no-acl "${path.join(backupDir, manifest!.dbDumpFilename)}"`, execOptions) } catch { /* warnings do not imply an incomplete restore */ }
      const restored = new PrismaClient({ datasources: { db: { url: restoreDbUrl } } })
      try {
        expect((await restored.payrollConfiguration.findUnique({ where: { id: configuration.id } }))?.name).toBe(`Configuration ${stamp}`)
        expect((await restored.salaryComponentDefinition.findUnique({ where: { id: component.id } }))?.name).toBe('Composant restauration Phase 6')
      } finally { await restored.$disconnect() }
    } finally {
      try { execSync(`/usr/local/bin/dropdb -h localhost -p 5436 -U ${dbUser} ${restoreDbName}`, execOptions) } catch { /* isolated database may not exist */ }
      await prisma.salaryComponentDefinition.deleteMany({ where: { tenantId } })
      await prisma.payrollConfiguration.deleteMany({ where: { tenantId } })
      if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true })
    }
  }, 30000)
})
