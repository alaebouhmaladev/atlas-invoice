import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import {
  validateTimesheetPeriod,
  lockAttendancePeriod,
  unlockAttendancePeriod
} from '../server/services/hrAttendanceValidation.service'

const TEST_TENANT = 'test-tenant-lock'

describe('HR Phase 4 — Timesheet Validation & Period Lock Tests', () => {
  let mockUser: any
  let site: any

  beforeEach(async () => {
    mockUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'Lock Admin',
        email: `lock-${Date.now()}@atlas.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN'
      }
    })

    site = await prisma.workSite.create({
      data: {
        tenantId: TEST_TENANT,
        code: `SITE-${Date.now()}`,
        name: 'Siège Social',
        createdById: mockUser.id
      }
    })
  })

  afterEach(async () => {
    await prisma.attendancePeriodLock.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.attendanceValidation.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.attendanceDay.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.workSite.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.auditLog.deleteMany({ where: { userId: mockUser?.id } })
    await prisma.user.deleteMany({ where: { tenantId: TEST_TENANT } })
  })

  it('should validate timesheet period when no critical anomalies exist', async () => {
    const pStart = new Date('2026-08-01T00:00:00.000Z')
    const pEnd = new Date('2026-08-31T23:59:59.999Z')

    const validation = await validateTimesheetPeriod(TEST_TENANT, site.id, pStart, pEnd, mockUser, 'Période Août validée')
    expect(validation.status).toBe('APPROVED')
  })

  it('should require exact typed confirmation "VERROUILLER POINTAGE" to lock period', async () => {
    const pStart = new Date('2026-08-01T00:00:00.000Z')
    const pEnd = new Date('2026-08-31T23:59:59.999Z')

    await expect(
      lockAttendancePeriod(TEST_TENANT, site.id, pStart, pEnd, 'INCORRECT STRING', mockUser)
    ).rejects.toThrow('VERROUILLER POINTAGE')

    const lock = await lockAttendancePeriod(TEST_TENANT, site.id, pStart, pEnd, 'VERROUILLER POINTAGE', mockUser)
    expect(lock.isLocked).toBe(true)
  })

  it('should unlock locked period with mandatory reason', async () => {
    const pStart = new Date('2026-08-01T00:00:00.000Z')
    const pEnd = new Date('2026-08-31T23:59:59.999Z')

    await lockAttendancePeriod(TEST_TENANT, site.id, pStart, pEnd, 'VERROUILLER POINTAGE', mockUser)

    await expect(
      unlockAttendancePeriod(TEST_TENANT, site.id, pStart, '', mockUser)
    ).rejects.toThrow('motif d’expresse justification')

    const unlocked = await unlockAttendancePeriod(TEST_TENANT, site.id, pStart, 'Ajustement exceptionnel heures supplémentaires', mockUser)
    expect(unlocked.isLocked).toBe(false)
  })
})
