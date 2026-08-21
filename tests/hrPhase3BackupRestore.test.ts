import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { runBackup } from '../scripts/backup'
import { createShiftTemplate } from '../server/services/hrShiftTemplate.service'
import { getOrCreateWorkSchedule, createScheduledShift, publishSchedule } from '../server/services/hrSchedule.service'
import { createStaffingRequirement } from '../server/services/hrCoverage.service'
import { createEmployeeAvailability } from '../server/services/hrAvailability.service'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

describe('HR Phase 3 — Real Database Dump & Isolated Restoration Verification', () => {
  let superAdminUser: any
  let site: any
  let emp: any
  let schedId: string
  const timestamp = Date.now()
  const rand = Math.floor(Math.random() * 100000)

  beforeAll(async () => {
    superAdminUser = await prisma.user.create({
      data: {
        tenantId: 'default-tenant',
        name: 'Super Admin Phase 3 Backup',
        email: `admin.p3bkp.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    site = await prisma.workSite.create({
      data: { tenantId: 'default-tenant', code: `SITE-P3BKP-${rand}`, name: 'Site Phase 3 Backup', createdById: superAdminUser.id }
    })

    const dept = await prisma.department.create({
      data: { tenantId: 'default-tenant', code: `DEPT-P3BKP-${rand}`, name: 'Cuisine', createdById: superAdminUser.id }
    })

    const pos = await prisma.position.create({
      data: { tenantId: 'default-tenant', code: `POS-P3BKP-${rand}`, title: 'Chef de cuisine', departmentId: dept.id, createdById: superAdminUser.id }
    })

    emp = await prisma.employee.create({
      data: {
        tenantId: 'default-tenant',
        employeeNumber: `EMP-P3BKP-${rand}`,
        firstName: 'Mehdi',
        lastName: 'Alami',
        displayName: 'Mehdi Alami',
        phonePrimary: '+212600000005',
        hireDate: new Date('2026-01-01'),
        gender: 'MALE',
        birthDate: new Date('1991-08-20'),
        cinEncrypted: 'ENC',
        cinFingerprint: `FP-P3BKP-${rand}`,
        employmentStatus: 'ACTIVE',
        createdById: superAdminUser.id
      }
    })

    await prisma.employeeAssignment.create({
      data: { tenantId: 'default-tenant', employeeId: emp.id, siteId: site.id, departmentId: dept.id, positionId: pos.id, isPrimary: true, startDate: new Date('2026-01-01'), createdById: superAdminUser.id }
    })

    // 1. Shift Template
    await createShiftTemplate({
      siteId: site.id,
      code: `TMPL-P3BKP-${rand}`,
      name: 'Shift Backup Test',
      segments: [{ order: 1, startLocalTime: '08:00', endLocalTime: '17:00' }]
    }, superAdminUser)

    // 2. Work Schedule & Shift
    const sched = await getOrCreateWorkSchedule(site.id, '2026-08-17', superAdminUser)
    schedId = sched.id
    await createScheduledShift({
      scheduleId: sched.id,
      employeeId: emp.id,
      siteId: site.id,
      positionId: pos.id,
      workDate: '2026-08-17',
      segments: [{ order: 1, startLocalTime: '08:00', endLocalTime: '17:00' }]
    }, superAdminUser)

    await publishSchedule(sched.id, 'PUBLIER PLANNING', superAdminUser)

    // 3. Staffing Coverage Requirement
    await createStaffingRequirement({
      siteId: site.id,
      positionId: pos.id,
      dayOfWeek: 1,
      startLocalTime: '08:00',
      endLocalTime: '17:00',
      minEmployees: 1
    }, superAdminUser)

    // 4. Employee Availability
    await createEmployeeAvailability({
      employeeId: emp.id,
      dayOfWeek: 6,
      status: 'UNAVAILABLE',
      reason: 'Repos hebdomadaire'
    }, superAdminUser)
  })

  it('runs backup process, verifies manifest checksums, and restores into isolated DB', async () => {
    const tmpBackupDir = path.join(process.cwd(), 'tmp', 'test_hr_phase3_backups')
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
    const restoreDbName = `atlas_bites_restore_isolated_${rand}`
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
        // Harmless warnings during schema restore (e.g., transaction_timeout) can cause exit code 1
      }

      // 3. Connect to isolated database using a dedicated PrismaClient instance
      const restorePrisma = new PrismaClient({ datasources: { db: { url: restoreDbUrl } } })

      try {
        const restoredSchedule = await restorePrisma.workSchedule.findUnique({
          where: { id: schedId },
          include: { shifts: { include: { segments: true } } }
        })

        expect(restoredSchedule).not.toBeNull()
        expect(restoredSchedule?.status).toBe('PUBLISHED')
        expect(restoredSchedule?.shifts.length).toBeGreaterThan(0)

        const restoredRequirement = await restorePrisma.staffingRequirement.findFirst({
          where: { siteId: site.id }
        })
        expect(restoredRequirement).not.toBeNull()
        expect(restoredRequirement?.minEmployees).toBe(1)

        const restoredAvailability = await restorePrisma.employeeAvailability.findFirst({
          where: { employeeId: emp.id }
        })
        expect(restoredAvailability).not.toBeNull()
        expect(restoredAvailability?.status).toBe('UNAVAILABLE')

        const restoredAuditLogs = await restorePrisma.auditLog.findMany({
          where: { entityType: 'WorkSchedule', entityId: schedId }
        })
        expect(restoredAuditLogs.length).toBeGreaterThan(0)
      } finally {
        await restorePrisma.$disconnect()
      }
    } finally {
      // Cleanup isolated database
      try {
        execSync(`/usr/local/bin/dropdb -h localhost -p 5436 -U ${dbUser} ${restoreDbName}`, execOpts)
      } catch {
        // Ignore drop error
      }
    }
  }, 30000)
})
