import { describe, it, expect, beforeAll } from 'vitest'
import { createStaffingRequirement } from '../server/services/hrCoverage.service'
import { getOrCreateWorkSchedule, createScheduledShift, calculateStaffingCoverage } from '../server/services/hrSchedule.service'
import { prisma } from '../server/utils/db'
import type { UserPublic } from '~/types/auth'

const mockUser: UserPublic = {
  id: 'test-admin-id',
  tenantId: 'test-tenant-coverage',
  name: 'Admin Test',
  email: 'admin.coverage@atlasbites.ma',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: new Date()
}

describe('HR Phase 3 — Staffing Coverage Requirements', () => {
  let siteId: string
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
      data: { tenantId: mockUser.tenantId!, code: `SITE-COV-${Date.now()}`, name: 'Site Couverture Resto', createdById: mockUser.id }
    })
    siteId = site.id

    const dept = await prisma.department.create({
      data: { tenantId: mockUser.tenantId!, code: `DEPT-${Date.now()}`, name: 'Salle', createdById: mockUser.id }
    })
    departmentId = dept.id

    const pos = await prisma.position.create({
      data: { tenantId: mockUser.tenantId!, code: `POS-${Date.now()}`, title: 'Hôte d’accueil', departmentId, createdById: mockUser.id }
    })
    positionId = pos.id

    const emp = await prisma.employee.create({
      data: {
        tenantId: mockUser.tenantId!,
        employeeNumber: `EMP-${Date.now()}`,
        firstName: 'Salma',
        lastName: 'Idrissi',
        displayName: 'Salma Idrissi',
        phonePrimary: '+212600000004',
        hireDate: new Date('2026-01-01'),
        gender: 'FEMALE',
        birthDate: new Date('1997-03-20'),
        cinEncrypted: 'ENC',
        cinFingerprint: `FP-${Date.now()}`,
        employmentStatus: 'ACTIVE',
        createdById: mockUser.id
      }
    })
    employeeId = emp.id

    await prisma.employeeAssignment.create({
      data: { tenantId: mockUser.tenantId!, employeeId, siteId, departmentId, positionId, isPrimary: true, startDate: new Date('2026-01-01'), createdById: mockUser.id }
    })

    const sched = await getOrCreateWorkSchedule(siteId, '2026-08-17', mockUser) // 2026-08-17 is Monday (dayOfWeek 1)
    scheduleId = sched.id
  })

  it('creates staffing requirement rule', async () => {
    const req = await createStaffingRequirement({
      siteId,
      positionId,
      dayOfWeek: 1, // Monday
      startLocalTime: '12:00',
      endLocalTime: '15:00',
      minEmployees: 1,
      preferredEmployees: 2
    }, mockUser)

    expect(req).toBeDefined()
    expect(req.minEmployees).toBe(1)
  })

  it('calculates coverage status as COMPLETE when shift covers interval', async () => {
    await createScheduledShift({
      scheduleId,
      employeeId,
      siteId,
      positionId,
      workDate: '2026-08-17',
      segments: [{ order: 1, startLocalTime: '11:00', endLocalTime: '16:00', segmentType: 'WORK' }]
    }, mockUser)

    const coverageResults = await calculateStaffingCoverage(siteId, '2026-08-17', mockUser)
    expect(coverageResults).toHaveLength(1)
    expect(coverageResults[0].actualCount).toBe(1)
    expect(coverageResults[0].status).toBe('COMPLETE')
  })
})
