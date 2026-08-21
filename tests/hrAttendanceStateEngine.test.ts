import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import { registerClockEvent } from '../server/services/hrAttendanceEvent.service'

const TEST_TENANT = 'test-tenant-state'

describe('HR Phase 4 — Attendance State Engine & Event Sequence Tests', () => {
  let mockUser: any
  let employee: any
  let site: any

  beforeEach(async () => {
    mockUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'State Admin',
        email: `state-${Date.now()}@atlas.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN'
      }
    })

    site = await prisma.workSite.create({
      data: {
        tenantId: TEST_TENANT,
        code: `SITE-${Date.now()}`,
        name: 'Restaurant Guéliz',
        createdById: mockUser.id
      }
    })

    employee = await prisma.employee.create({
      data: {
        tenantId: TEST_TENANT,
        employeeNumber: `EMP-${Date.now()}`,
        firstName: 'Youssef',
        lastName: 'Mansouri',
        displayName: 'Youssef Mansouri',
        phonePrimary: '+212600000001',
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

  it('should allow valid sequence: CLOCK_IN -> BREAK_START -> BREAK_END -> CLOCK_OUT', async () => {
    const t0 = new Date('2026-08-20T08:00:00.000Z')
    const t1 = new Date('2026-08-20T12:00:00.000Z')
    const t2 = new Date('2026-08-20T13:00:00.000Z')
    const t3 = new Date('2026-08-20T17:00:00.000Z')

    const res1 = await registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_IN', 'EMPLOYEE_WEB', { customTimestamp: t0 })
    expect(res1.event.eventType).toBe('CLOCK_IN')

    const res2 = await registerClockEvent(TEST_TENANT, employee.id, site.id, 'BREAK_START', 'EMPLOYEE_WEB', { customTimestamp: t1 })
    expect(res2.event.eventType).toBe('BREAK_START')

    const res3 = await registerClockEvent(TEST_TENANT, employee.id, site.id, 'BREAK_END', 'EMPLOYEE_WEB', { customTimestamp: t2 })
    expect(res3.event.eventType).toBe('BREAK_END')

    const res4 = await registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_OUT', 'EMPLOYEE_WEB', { customTimestamp: t3 })
    expect(res4.event.eventType).toBe('CLOCK_OUT')
    expect(res4.day?.status).toBe('COMPLETE')
  })

  it('should reject double CLOCK_IN without CLOCK_OUT', async () => {
    await registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_IN', 'EMPLOYEE_WEB')

    await expect(
      registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_IN', 'EMPLOYEE_WEB')
    ).rejects.toThrow('déjà pointé en entrée')
  })

  it('should reject BREAK_START without open CLOCK_IN', async () => {
    await expect(
      registerClockEvent(TEST_TENANT, employee.id, site.id, 'BREAK_START', 'EMPLOYEE_WEB')
    ).rejects.toThrow('sans pointage d’entrée actif')
  })

  it('should reject CLOCK_OUT without open session', async () => {
    await expect(
      registerClockEvent(TEST_TENANT, employee.id, site.id, 'CLOCK_OUT', 'EMPLOYEE_WEB')
    ).rejects.toThrow('Aucune session de pointage active')
  })
})
