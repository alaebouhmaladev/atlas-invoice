import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { calculateStaffingCoverage, getOrCreateWorkSchedule, createScheduledShift } from '../server/services/hrSchedule.service'
import { createStaffingRequirement } from '../server/services/hrCoverage.service'
import { createEmployee } from '../server/services/hrEmployee.service'
import { createSite, createDepartment, createPosition } from '../server/services/hrOrganization.service'
import { createAssignment } from '../server/services/hrAssignment.service'
import type { UserPublic } from '~/types/auth'

describe('HR Phase 3 — Operational Staffing Coverage Break Rules', () => {
  let actor: UserPublic
  let siteId: string
  let positionId: string
  let employeeId: string
  let scheduleId: string

  beforeAll(async () => {
    const timestamp = Date.now()
    const tenantId = `tenant-covbreak-${timestamp}`

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: 'Admin Coverage Breaks',
        email: `admin.covbreak.${timestamp}@atlasbites.ma`,
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

    const site = await createSite({ code: `SITE-COV-${timestamp}`, name: 'Site Coverage', city: 'Casablanca' }, actor)
    siteId = site.id

    const dept = await createDepartment({ code: `DEPT-COV-${timestamp}`, name: 'Service' }, actor)
    const pos = await createPosition({ departmentId: dept.id, code: `POS-COV-${timestamp}`, title: 'Caissier' }, actor)
    positionId = pos.id

    const emp = await createEmployee({
      firstName: 'Fatima',
      lastName: 'Caissiere',
      phonePrimary: `+2126${timestamp.toString().slice(-8)}`,
      hireDate: '2024-01-01'
    }, actor)
    employeeId = emp.id

    await createAssignment({
      employeeId,
      siteId,
      departmentId: dept.id,
      positionId,
      assignmentType: 'PERMANENT',
      isPrimary: true,
      startDate: '2024-01-01'
    }, actor)

    // Staffing requirement: 1 cashier required between 15:00 and 15:30 on Monday (dayOfWeek = 1)
    await createStaffingRequirement({
      siteId,
      positionId,
      dayOfWeek: 1,
      startLocalTime: '15:00',
      endLocalTime: '15:30',
      minEmployees: 1
    }, actor)

    const sched = await getOrCreateWorkSchedule(siteId, '2026-08-17', actor)
    scheduleId = sched.id
  })

  it('produces UNDERSTAFFED coverage shortage when employee is on paid break during required time', async () => {
    // Create shift with a PAID_BREAK segment between 15:00 and 15:30
    await createScheduledShift({
      scheduleId,
      employeeId,
      siteId,
      positionId,
      workDate: '2026-08-17',
      segments: [
        { order: 1, startLocalTime: '12:00', endLocalTime: '15:00', segmentType: 'WORK' },
        { order: 2, startLocalTime: '15:00', endLocalTime: '15:30', segmentType: 'PAID_BREAK' },
        { order: 3, startLocalTime: '15:30', endLocalTime: '19:00', segmentType: 'WORK' }
      ]
    }, actor)

    // Calculate coverage for 2026-08-17 (Monday)
    const coverage = await calculateStaffingCoverage(siteId, '2026-08-17', actor)
    expect(coverage.length).toBe(1)

    const res = coverage[0]
    expect(res.positionId).toBe(positionId)
    expect(res.minRequired).toBe(1)
    expect(res.actualCount).toBe(0) // Paid break does NOT count toward operational presence!
    expect(res.status).toBe('UNDERSTAFFED')
  })
})
