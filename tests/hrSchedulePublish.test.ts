import { describe, it, expect, beforeAll } from 'vitest'
import {
  getOrCreateWorkSchedule,
  createScheduledShift,
  publishSchedule,
  copyPreviousWeek,
  changePublishedShift
} from '../server/services/hrSchedule.service'
import { prisma } from '../server/utils/db'
import type { UserPublic } from '~/types/auth'

const mockUser: UserPublic = {
  id: 'test-admin-id',
  tenantId: 'test-tenant-publish',
  name: 'Admin Test',
  email: 'admin.publish@atlasbites.ma',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: new Date()
}

describe('HR Phase 3 — Schedule Publish, Copy Week & Post-Publication Changes', () => {
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
      data: { tenantId: mockUser.tenantId!, code: `SITE-PUB-${Date.now()}`, name: 'Site Publish Resto', createdById: mockUser.id }
    })
    siteId = site.id

    const dept = await prisma.department.create({
      data: { tenantId: mockUser.tenantId!, code: `DEPT-${Date.now()}`, name: 'Salle', createdById: mockUser.id }
    })
    departmentId = dept.id

    const pos = await prisma.position.create({
      data: { tenantId: mockUser.tenantId!, code: `POS-${Date.now()}`, title: 'Chef de rang', departmentId, createdById: mockUser.id }
    })
    positionId = pos.id

    const emp = await prisma.employee.create({
      data: {
        tenantId: mockUser.tenantId!,
        employeeNumber: `EMP-${Date.now()}`,
        firstName: 'Youssef',
        lastName: 'Tazi',
        displayName: 'Youssef Tazi',
        phonePrimary: '+212600000003',
        hireDate: new Date('2026-01-01'),
        gender: 'MALE',
        birthDate: new Date('1992-05-15'),
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

    const sched = await getOrCreateWorkSchedule(siteId, '2026-08-17', mockUser)
    scheduleId = sched.id

    await createScheduledShift({
      scheduleId,
      employeeId,
      siteId,
      positionId,
      workDate: '2026-08-17',
      segments: [{ order: 1, startLocalTime: '09:00', endLocalTime: '17:00' }]
    }, mockUser)
  })

  it('rejects publication with incorrect confirmation phrase', async () => {
    await expect(publishSchedule(scheduleId, 'WRONG CONFIRMATION', mockUser)).rejects.toThrow(/confirmation est incorrecte/)
  })

  it('publishes schedule with correct typed phrase "PUBLIER PLANNING"', async () => {
    const published = await publishSchedule(scheduleId, 'PUBLIER PLANNING', mockUser)
    expect(published.status).toBe('PUBLISHED')
    expect(published.publishedAt).not.toBeNull()
    expect(published.publishedByUserId).toBe(mockUser.id)
  })

  it('records post-publication change history when modifying published shift', async () => {
    const shifts = await prisma.scheduledShift.findMany({ where: { scheduleId } })
    expect(shifts).toHaveLength(1)
    const shift = shifts[0]

    const updated = await changePublishedShift(
      shift.id,
      { notes: 'Modifié suite à ajustement de service' },
      'Remplacement imprévu et ajustement d’horaire',
      mockUser
    )

    expect(updated?.status).toBe('CHANGED')

    const history = await prisma.scheduleChangeHistory.findMany({ where: { shiftId: shift.id } })
    expect(history).toHaveLength(1)
    expect(history[0].changeReason).toBe('Remplacement imprévu et ajustement d’horaire')
    expect(history[0].changedById).toBe(mockUser.id)
  })

  it('copies previous week schedule to next week draft', async () => {
    const result = await copyPreviousWeek(
      siteId,
      '2026-08-17',
      '2026-08-24',
      true,
      mockUser
    )

    expect(result.copiedCount).toBe(1)

    const targetSched = await getOrCreateWorkSchedule(siteId, '2026-08-24', mockUser)
    expect(targetSched.shifts).toHaveLength(1)
    expect(targetSched.shifts[0].status).toBe('PLANNED')
  })
})
