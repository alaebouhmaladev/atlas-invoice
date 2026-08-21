import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import { registerClockEvent } from '../server/services/hrAttendanceEvent.service'
import { resolveAnomaly } from '../server/services/hrAttendanceAnomaly.service'

const TEST_TENANT = 'test-tenant-anomaly'

describe('HR Phase 4 — Attendance Anomaly Engine Tests', () => {
  let mockUser: any
  let employee: any
  let site: any

  beforeEach(async () => {
    mockUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'Anomaly Admin',
        email: `ano-${Date.now()}@atlas.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN'
      }
    })

    site = await prisma.workSite.create({
      data: {
        tenantId: TEST_TENANT,
        code: `SITE-${Date.now()}`,
        name: 'Cuisine Centrale',
        createdById: mockUser.id
      }
    })

    employee = await prisma.employee.create({
      data: {
        tenantId: TEST_TENANT,
        employeeNumber: `EMP-${Date.now()}`,
        firstName: 'Farid',
        lastName: 'Zahiri',
        displayName: 'Farid Zahiri',
        phonePrimary: '+212600000004',
        hireDate: new Date('2026-01-01'),
        createdById: mockUser.id
      }
    })
  })

  afterEach(async () => {
    await prisma.attendanceAnomaly.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.attendanceDay.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.attendanceEvent.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.employee.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.workSite.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.auditLog.deleteMany({ where: { userId: mockUser?.id } })
    await prisma.user.deleteMany({ where: { tenantId: TEST_TENANT } })
  })

  it('should detect unscheduled attendance anomaly and resolve with note', async () => {
    const res = await registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_IN', 'EMPLOYEE_WEB')

    const anomalies = await prisma.attendanceAnomaly.findMany({
      where: { tenantId: TEST_TENANT, employeeId: employee.id }
    })

    expect(anomalies.length).toBeGreaterThan(0)
    const anomaly = anomalies[0]
    expect(anomaly.isResolved).toBe(false)

    const resolved = await resolveAnomaly(TEST_TENANT, anomaly.id, 'Pointage validé exceptionnellement', mockUser)
    expect(resolved.isResolved).toBe(true)
    expect(resolved.resolutionNote).toBe('Pointage validé exceptionnellement')
  })
})
