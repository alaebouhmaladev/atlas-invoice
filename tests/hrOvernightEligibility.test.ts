import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { createScheduledShift, getOrCreateWorkSchedule, detectShiftConflicts } from '../server/services/hrSchedule.service'
import { createEmployee } from '../server/services/hrEmployee.service'
import { createSite, createDepartment, createPosition } from '../server/services/hrOrganization.service'
import { createAssignment } from '../server/services/hrAssignment.service'
import type { UserPublic } from '~/types/auth'

describe('HR Phase 3 — Overnight Shift Assignment Eligibility Across Complete Interval', () => {
  let actor: UserPublic
  let siteId: string
  let departmentId: string
  let positionId: string
  let employeeId: string
  let scheduleId: string

  beforeAll(async () => {
    const timestamp = Date.now()
    const tenantId = `tenant-overnight-${timestamp}`

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: 'Admin Overnight Test',
        email: `admin.overnight.${timestamp}@atlasbites.ma`,
        role: 'SUPER_ADMIN',
        passwordHash: 'hash',
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

    const site = await createSite({ code: `SITE-ON-${timestamp}`, name: 'Site Overnight', city: 'Casablanca' }, actor)
    siteId = site.id

    const dept = await createDepartment({ code: `DEPT-ON-${timestamp}`, name: 'Night Service' }, actor)
    departmentId = dept.id

    const pos = await createPosition({ departmentId, code: `POS-ON-${timestamp}`, title: 'Veilleur' }, actor)
    positionId = pos.id

    const emp = await createEmployee({
      firstName: 'Youssef',
      lastName: 'Night',
      phonePrimary: `+2126${timestamp.toString().slice(-8)}`,
      hireDate: '2024-01-01'
    }, actor)
    employeeId = emp.id

    // Temporary assignment ending on 2026-08-17 (so it expires before 2026-08-18 morning!)
    await createAssignment({
      employeeId,
      siteId,
      departmentId,
      positionId,
      assignmentType: 'TEMPORARY',
      isPrimary: true,
      startDate: '2026-08-01',
      endDate: '2026-08-17'
    }, actor)

    const sched = await getOrCreateWorkSchedule(siteId, '2026-08-17', actor)
    scheduleId = sched.id
  })

  it('rejects an overnight shift if employee assignment expires before the end of the shift next morning', async () => {
    // Proposed overnight shift: 17/08/2026 22:00 -> 18/08/2026 06:00 (+1j)
    const shiftData = {
      scheduleId,
      employeeId,
      siteId,
      positionId,
      workDate: '2026-08-17',
      segments: [
        { order: 1, startLocalTime: '22:00', endLocalTime: '06:00', endsNextDay: true, segmentType: 'WORK' as const }
      ]
    }

    const conflicts = await detectShiftConflicts(
      actor.tenantId || 'default-tenant',
      employeeId,
      siteId,
      new Date('2026-08-17'),
      shiftData.segments
    )

    const blocking = conflicts.filter(c => c.type === 'BLOCKING' && c.code === 'INELIGIBLE_EMPLOYEE')
    expect(blocking.length).toBeGreaterThan(0)
    expect(blocking[0].message).toContain('affectation')

    await expect(createScheduledShift(shiftData, actor)).rejects.toThrow()
  })
})
