import { describe, it, expect, beforeAll } from 'vitest'
import { AvailabilityStatus } from '@prisma/client'
import { createScheduledShift, getOrCreateWorkSchedule, detectShiftConflicts } from '../server/services/hrSchedule.service'
import { createEmployeeAvailability } from '../server/services/hrAvailability.service'
import { prisma } from '../server/utils/db'
import type { UserPublic } from '~/types/auth'

const mockUser: UserPublic = {
  id: 'test-admin-id',
  tenantId: 'test-tenant-conflicts',
  name: 'Admin Test',
  email: 'admin.conflicts@atlasbites.ma',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: new Date()
}

describe('HR Phase 3 — Conflict Detection Engine', () => {
  let siteId: string
  let siteBId: string
  let employeeId: string
  let departmentId: string
  let positionId: string
  let scheduleId: string

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: mockUser.id },
      update: { tenantId: mockUser.tenantId },
      create: {
        id: mockUser.id,
        tenantId: mockUser.tenantId,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        passwordHash: 'dummy'
      }
    })

    const site = await prisma.workSite.create({
      data: { tenantId: mockUser.tenantId!, code: `SITE-CONF-${Date.now()}`, name: 'Site Conflit Resto', createdById: mockUser.id }
    })
    siteId = site.id

    const siteB = await prisma.workSite.create({
      data: { tenantId: mockUser.tenantId!, code: `SITE-CONF-B-${Date.now()}`, name: 'Site Conflit B', createdById: mockUser.id }
    })
    siteBId = siteB.id

    const dept = await prisma.department.create({
      data: { tenantId: mockUser.tenantId!, code: `DEPT-${Date.now()}`, name: 'Cuisine', createdById: mockUser.id }
    })
    departmentId = dept.id

    const pos = await prisma.position.create({
      data: { tenantId: mockUser.tenantId!, code: `POS-${Date.now()}`, title: 'Cuisinier', departmentId, createdById: mockUser.id }
    })
    positionId = pos.id

    const emp = await prisma.employee.create({
      data: {
        tenantId: mockUser.tenantId!,
        employeeNumber: `EMP-${Date.now()}`,
        firstName: 'Omar',
        lastName: 'Bennani',
        displayName: 'Omar Bennani',
        phonePrimary: '+212600000002',
        hireDate: new Date('2026-01-01'),
        gender: 'MALE',
        birthDate: new Date('1990-01-01'),
        cinEncrypted: 'ENC',
        cinFingerprint: `FP-${Date.now()}`,
        employmentStatus: 'ACTIVE',
        createdById: mockUser.id
      }
    })
    employeeId = emp.id

    // Permanent assignment for siteId and siteBId
    await prisma.employeeAssignment.createMany({
      data: [
        { tenantId: mockUser.tenantId!, employeeId, siteId, departmentId, positionId, isPrimary: true, startDate: new Date('2026-01-01'), createdById: mockUser.id },
        { tenantId: mockUser.tenantId!, employeeId, siteId: siteBId, departmentId, positionId, isPrimary: false, startDate: new Date('2026-01-01'), createdById: mockUser.id }
      ]
    })

    const sched = await getOrCreateWorkSchedule(siteId, '2026-08-17', mockUser)
    scheduleId = sched.id
  })

  it('detects overlapping shift conflict for same employee', async () => {
    // Create initial shift 08:00 - 16:00
    await createScheduledShift({
      scheduleId,
      employeeId,
      siteId,
      positionId,
      workDate: '2026-08-17',
      segments: [{ order: 1, startLocalTime: '08:00', endLocalTime: '16:00', segmentType: 'WORK' }]
    }, mockUser)

    // Attempt overlapping shift 14:00 - 20:00
    const conflicts = await detectShiftConflicts(
      mockUser.tenantId!,
      employeeId,
      siteId,
      new Date('2026-08-17T12:00:00Z'),
      [{ order: 1, startLocalTime: '14:00', endLocalTime: '20:00', segmentType: 'WORK' }]
    )

    const blocking = conflicts.filter(c => c.type === 'BLOCKING')
    expect(blocking).toHaveLength(1)
    expect(blocking[0].code).toBe('SHIFT_OVERLAP')
  })

  it('triggers unavailability warning when employee declared unavailable', async () => {
    await createEmployeeAvailability({
      employeeId,
      dayOfWeek: 1, // Monday
      status: 'UNAVAILABLE',
      reason: 'Formation personnelle'
    }, mockUser)

    const conflicts = await detectShiftConflicts(
      mockUser.tenantId!,
      employeeId,
      siteId,
      new Date('2026-08-17T12:00:00Z'), // Monday
      [{ order: 1, startLocalTime: '18:00', endLocalTime: '23:00', segmentType: 'WORK' }]
    )

    const warnings = conflicts.filter(c => c.type === 'WARNING')
    expect(warnings.some(w => w.code === 'EMPLOYEE_UNAVAILABLE')).toBe(true)
  })
})
