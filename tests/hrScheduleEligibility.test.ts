import { describe, it, expect, beforeAll } from 'vitest'
import { verifyEmployeeEligibility } from '../server/services/hrSchedule.service'
import { prisma } from '../server/utils/db'
import type { UserPublic } from '~/types/auth'

const mockUser: UserPublic = {
  id: 'test-admin-id',
  tenantId: 'test-tenant-eligibility',
  name: 'Admin Test',
  email: 'admin.eligibility@atlasbites.ma',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: new Date()
}

describe('HR Phase 3 — Schedule Eligibility & Assignment Validation', () => {
  let siteAId: string
  let siteBId: string
  let employeeId: string
  let departmentId: string
  let positionId: string

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

    const siteA = await prisma.workSite.create({
      data: { tenantId: mockUser.tenantId!, code: `SITE-A-${Date.now()}`, name: 'Site A Resto', createdById: mockUser.id }
    })
    siteAId = siteA.id

    const siteB = await prisma.workSite.create({
      data: { tenantId: mockUser.tenantId!, code: `SITE-B-${Date.now()}`, name: 'Site B Cuisine', createdById: mockUser.id }
    })
    siteBId = siteB.id

    const dept = await prisma.department.create({
      data: { tenantId: mockUser.tenantId!, code: `DEPT-${Date.now()}`, name: 'Service Resto', createdById: mockUser.id }
    })
    departmentId = dept.id

    const pos = await prisma.position.create({
      data: { tenantId: mockUser.tenantId!, code: `POS-${Date.now()}`, title: 'Serveur', departmentId, createdById: mockUser.id }
    })
    positionId = pos.id

    const emp = await prisma.employee.create({
      data: {
        tenantId: mockUser.tenantId!,
        employeeNumber: `EMP-${Date.now()}`,
        firstName: 'Karim',
        lastName: 'Fassi',
        displayName: 'Karim Fassi',
        phonePrimary: '+212600000001',
        hireDate: new Date('2026-01-01'),
        gender: 'MALE',
        birthDate: new Date('1995-04-12'),
        cinEncrypted: 'ENC',
        cinFingerprint: `FP-${Date.now()}`,
        employmentStatus: 'ACTIVE',
        createdById: mockUser.id
      }
    })
    employeeId = emp.id

    // Create assignment for Site A starting 2026-08-01 ending 2026-08-31
    await prisma.employeeAssignment.create({
      data: {
        tenantId: mockUser.tenantId!,
        employeeId,
        siteId: siteAId,
        departmentId,
        positionId,
        isPrimary: true,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-08-31'),
        createdById: mockUser.id
      }
    })
  })

  it('approves eligibility during active assignment date range', async () => {
    const res = await verifyEmployeeEligibility(employeeId, siteAId, new Date('2026-08-15'), mockUser.tenantId!)
    expect(res.isEligible).toBe(true)
    expect(res.assignmentId).toBeDefined()
  })

  it('rejects eligibility before assignment start date', async () => {
    const res = await verifyEmployeeEligibility(employeeId, siteAId, new Date('2026-07-25'), mockUser.tenantId!)
    expect(res.isEligible).toBe(false)
    expect(res.reason).toMatch(/pas d'affectation/i)
  })

  it('rejects eligibility after assignment end date', async () => {
    const res = await verifyEmployeeEligibility(employeeId, siteAId, new Date('2026-09-05'), mockUser.tenantId!)
    expect(res.isEligible).toBe(false)
    expect(res.reason).toMatch(/pas d'affectation/i)
  })

  it('rejects eligibility for unassigned site B', async () => {
    const res = await verifyEmployeeEligibility(employeeId, siteBId, new Date('2026-08-15'), mockUser.tenantId!)
    expect(res.isEligible).toBe(false)
    expect(res.reason).toMatch(/pas d'affectation/i)
  })
})
