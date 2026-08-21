import { describe, it, expect, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createScheduledShift, getOrCreateWorkSchedule } from '../server/services/hrSchedule.service'
import { createSite, createDepartment, createPosition } from '../server/services/hrOrganization.service'
import { createEmployee } from '../server/services/hrEmployee.service'
import { createAssignment } from '../server/services/hrAssignment.service'
import { prisma } from '../server/utils/db'
import type { UserPublic } from '~/types/auth'

describe('HR Phase 3 — Concurrency & Race Condition Protection', () => {
  let siteId: string
  let employeeId: string
  let departmentId: string
  let positionId: string
  let scheduleId: string
  let actor: UserPublic

  beforeAll(async () => {
    const timestamp = Date.now()
    const tenantId = `tenant-concurrency-${timestamp}`

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: 'Admin Concurrency',
        email: `admin.conc.${timestamp}@atlasbites.ma`,
        role: 'SUPER_ADMIN',
        passwordHash: 'test-hash',
        isActive: true
      }
    })

    actor = {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: true,
      createdAt: user.createdAt
    }

    const site = await createSite({
      code: `SITE-CONC-${timestamp}`,
      name: 'Site Concurrency',
      city: 'Casablanca'
    }, actor)
    siteId = site.id

    const dept = await createDepartment({
      code: `DEPT-CONC-${timestamp}`,
      name: 'Cuisine Concurrency'
    }, actor)
    departmentId = dept.id

    const pos = await createPosition({
      departmentId,
      code: `POS-CONC-${timestamp}`,
      title: 'Chef de Partie'
    }, actor)
    positionId = pos.id

    const emp = await createEmployee({
      firstName: 'Kamal',
      lastName: 'Concurrency',
      phonePrimary: `+2126${timestamp.toString().slice(-8)}`,
      hireDate: '2024-01-01'
    }, actor)
    employeeId = emp.id

    await createAssignment({
      employeeId,
      siteId,
      departmentId,
      positionId,
      assignmentType: 'PERMANENT',
      isPrimary: true,
      startDate: '2024-01-01'
    }, actor)

    const schedule = await getOrCreateWorkSchedule(siteId, '2026-08-17', actor)
    scheduleId = schedule.id
  })

  it('prevents duplicate WorkSchedule container creation when executed concurrently', async () => {
    const results = await Promise.all([
      getOrCreateWorkSchedule(siteId, '2026-08-17', actor),
      getOrCreateWorkSchedule(siteId, '2026-08-17', actor)
    ])

    expect(results[0].id).toBe(results[1].id)

    const count = await prisma.workSchedule.count({
      where: { tenantId: actor.tenantId, siteId, periodStart: results[0].periodStart }
    })
    expect(count).toBe(1)
  })

  it('rejects double-booking when two concurrent shift creation requests are attempted', async () => {
    const shiftData = {
      scheduleId,
      employeeId,
      siteId,
      positionId,
      workDate: '2026-08-17',
      segments: [{ order: 1, startLocalTime: '11:00', endLocalTime: '16:00', segmentType: 'WORK' as const }]
    }

    const client2 = new PrismaClient()

    try {
      const p1 = createScheduledShift(shiftData, actor)
      const p2 = createScheduledShift({ ...shiftData, workDate: '2026-08-17' }, actor)

      const results = await Promise.allSettled([p1, p2])
      const fulfilled = results.filter(r => r.status === 'fulfilled')
      const rejected = results.filter(r => r.status === 'rejected')

      expect(fulfilled.length).toBe(1)
      expect(rejected.length).toBe(1)
    } finally {
      await client2.$disconnect()
    }
  })
})
