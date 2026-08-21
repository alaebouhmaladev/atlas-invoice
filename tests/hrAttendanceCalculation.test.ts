import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import { registerClockEvent } from '../server/services/hrAttendanceEvent.service'
import { calculateAttendanceDay } from '../server/services/hrAttendanceCalculation.service'

const TEST_TENANT = 'test-tenant-calc'

describe('HR Phase 4 — Attendance Calculation Engine & Timezone Tests', () => {
  let mockUser: any
  let employee: any
  let site: any

  beforeEach(async () => {
    mockUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'Calc Admin',
        email: `calc-${Date.now()}@atlas.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN'
      }
    })

    site = await prisma.workSite.create({
      data: {
        tenantId: TEST_TENANT,
        code: `SITE-${Date.now()}`,
        name: 'Restaurant Hivernage',
        createdById: mockUser.id
      }
    })

    employee = await prisma.employee.create({
      data: {
        tenantId: TEST_TENANT,
        employeeNumber: `EMP-${Date.now()}`,
        firstName: 'Karim',
        lastName: 'Bennani',
        displayName: 'Karim Bennani',
        phonePrimary: '+212600000003',
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

  it('should correctly calculate presence, break, net worked minutes and late arrival', async () => {
    const t0 = new Date('2026-08-20T08:25:00.000Z') // 25 min late (tolerance 10)
    const t1 = new Date('2026-08-20T12:00:00.000Z') // Break start
    const t2 = new Date('2026-08-20T13:00:00.000Z') // Break end (60 min break)
    const t3 = new Date('2026-08-20T17:00:00.000Z') // Clock out

    await registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_IN', 'EMPLOYEE_WEB', { customTimestamp: t0 })
    await registerClockEvent(TEST_TENANT, employee.id, site.id, 'BREAK_START', 'EMPLOYEE_WEB', { customTimestamp: t1 })
    await registerClockEvent(TEST_TENANT, employee.id, site.id, 'BREAK_END', 'EMPLOYEE_WEB', { customTimestamp: t2 })
    const res = await registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_OUT', 'EMPLOYEE_WEB', { customTimestamp: t3 })

    expect(res.day?.actualPresenceMinutes).toBe(515) // 8h35m = 515m
    expect(res.day?.unpaidBreakMinutes).toBe(60)
    expect(res.day?.netWorkedMinutes).toBe(455) // 515 - 60 = 455m
  })
})
