import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import { registerClockEvent } from '../server/services/hrAttendanceEvent.service'

const TEST_TENANT = 'test-tenant-concurrency'

describe('HR Phase 4 — Attendance Concurrency & Idempotency Tests', () => {
  let mockUser: any
  let employee: any
  let site: any

  beforeEach(async () => {
    mockUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'Concurrency Admin',
        email: `conc-${Date.now()}@atlas.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN'
      }
    })

    site = await prisma.workSite.create({
      data: {
        tenantId: TEST_TENANT,
        code: `SITE-${Date.now()}`,
        name: 'Traiteur Hivernage',
        createdById: mockUser.id
      }
    })

    employee = await prisma.employee.create({
      data: {
        tenantId: TEST_TENANT,
        employeeNumber: `EMP-${Date.now()}`,
        firstName: 'Samira',
        lastName: 'Alami',
        displayName: 'Samira Alami',
        phonePrimary: '+212600000002',
        hireDate: new Date('2026-01-01'),
        createdById: mockUser.id
      }
    })
  })

  afterEach(async () => {
    await prisma.attendanceDay.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.attendanceEvent.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.employee.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.workSite.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.auditLog.deleteMany({ where: { userId: mockUser?.id } })
    await prisma.user.deleteMany({ where: { tenantId: TEST_TENANT } })
  })

  it('should handle identical idempotency key requests deterministically without duplication', async () => {
    const idempotencyKey = `idemp-key-${Date.now()}`

    const res1 = await registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_IN', 'EMPLOYEE_WEB', { idempotencyKey })
    expect(res1.isDuplicate).toBe(false)

    const res2 = await registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_IN', 'EMPLOYEE_WEB', { idempotencyKey })
    expect(res2.isDuplicate).toBe(true)
    expect(res2.event.id).toBe(res1.event.id)
  })

  it('should reject simultaneous double clock-in attempts safely', async () => {
    const p1 = registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_IN', 'EMPLOYEE_WEB')
    const p2 = registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_IN', 'EMPLOYEE_WEB')

    const results = await Promise.allSettled([p1, p2])
    const fulfilled = results.filter(r => r.status === 'fulfilled')
    const rejected = results.filter(r => r.status === 'rejected')

    expect(fulfilled.length).toBe(1)
    expect(rejected.length).toBe(1)
  })
})
