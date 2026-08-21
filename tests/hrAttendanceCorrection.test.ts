import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import { requestCorrection, reviewCorrection } from '../server/services/hrAttendanceCorrection.service'

const TEST_TENANT = 'test-tenant-correct'

describe('HR Phase 4 — Attendance Correction & Review Workflow Tests', () => {
  let hrUser: any
  let employeeUser: any
  let superAdminUser: any
  let employee: any
  let site: any

  beforeEach(async () => {
    hrUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'HR Manager',
        email: `hr-${Date.now()}@atlas.ma`,
        passwordHash: 'hash',
        role: 'HR_MANAGER'
      }
    })

    superAdminUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'Super Admin',
        email: `superadmin-${Date.now()}@atlas.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN'
      }
    })

    employeeUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'Nadia Tazi',
        email: `nadia-${Date.now()}@atlas.ma`,
        passwordHash: 'hash',
        role: 'ACCOUNTANT'
      }
    })

    site = await prisma.workSite.create({
      data: {
        tenantId: TEST_TENANT,
        code: `SITE-${Date.now()}`,
        name: 'Agence Agdal',
        createdById: hrUser.id
      }
    })

    employee = await prisma.employee.create({
      data: {
        tenantId: TEST_TENANT,
        employeeNumber: `EMP-${Date.now()}`,
        firstName: 'Nadia',
        lastName: 'Tazi',
        displayName: 'Nadia Tazi',
        phonePrimary: '+212600000005',
        hireDate: new Date('2026-01-01'),
        linkedUserId: employeeUser.id,
        createdById: hrUser.id
      }
    })
  })

  afterEach(async () => {
    await prisma.attendanceCorrectionHistory.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.attendanceCorrectionRequest.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.attendanceEvent.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.attendanceDay.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.employee.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.workSite.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.auditLog.deleteMany({ where: { userId: hrUser?.id } })
    await prisma.user.deleteMany({ where: { tenantId: TEST_TENANT } })
  })

  it('should create correction request successfully', async () => {
    const correction = await requestCorrection(
      TEST_TENANT,
      {
        employeeId: employee.id,
        siteId: site.id,
        workDate: '2026-08-20',
        reason: 'Oubli de pointage à la sortie suite à une coupure électrique.',
        requestedClockIn: '2026-08-20T08:00:00.000Z',
        requestedClockOut: '2026-08-20T17:00:00.000Z',
        requestedChanges: { note: 'Pointage rétabli' }
      },
      employeeUser
    )

    expect(correction.status).toBe('PENDING')
    expect(correction.reason).toContain('Oubli de pointage')
  })

  it('should prevent employee self-approval of correction request', async () => {
    const correction = await requestCorrection(
      TEST_TENANT,
      {
        employeeId: employee.id,
        siteId: site.id,
        workDate: '2026-08-20',
        reason: 'Demande de correction personnelle',
        requestedChanges: {}
      },
      employeeUser
    )

    await expect(
      reviewCorrection(TEST_TENANT, correction.id, 'APPROVED', 'Tentative auto-approbation', employeeUser)
    ).rejects.toThrow('personnellement soumise')
  })

  it('should prevent manager from approving a correction request they personally submitted for an employee', async () => {
    const correction = await requestCorrection(
      TEST_TENANT,
      {
        employeeId: employee.id,
        siteId: site.id,
        workDate: '2026-08-20',
        reason: 'Correction soumise par le manager',
        requestedChanges: {}
      },
      hrUser // Submitted by HR Manager
    )

    await expect(
      reviewCorrection(TEST_TENANT, correction.id, 'APPROVED', 'Manager self approval attempt', hrUser)
    ).rejects.toThrow('personnellement soumise')
  })

  it('should prevent Super Admin from approving a correction request they personally submitted', async () => {
    const correction = await requestCorrection(
      TEST_TENANT,
      {
        employeeId: employee.id,
        siteId: site.id,
        workDate: '2026-08-20',
        reason: 'Correction par Super Admin',
        requestedChanges: {}
      },
      superAdminUser // Submitted by Super Admin
    )

    await expect(
      reviewCorrection(TEST_TENANT, correction.id, 'APPROVED', 'Super Admin self approval attempt', superAdminUser)
    ).rejects.toThrow('personnellement soumise')
  })

  it('should approve correction, recalculate day, and log history when reviewed by an independent HR manager', async () => {
    const correction = await requestCorrection(
      TEST_TENANT,
      {
        employeeId: employee.id,
        siteId: site.id,
        workDate: '2026-08-20',
        reason: 'Correction d’heure de sortie validée par un réviseur indépendant',
        requestedClockIn: '2026-08-20T08:00:00.000Z',
        requestedClockOut: '2026-08-20T16:00:00.000Z',
        requestedChanges: {}
      },
      employeeUser // Submitted by employee
    )

    // Approved by independent HR Manager
    const reviewed = await reviewCorrection(TEST_TENANT, correction.id, 'APPROVED', 'Correction légitime', hrUser)
    expect(reviewed.status).toBe('APPROVED')

    const histories = await prisma.attendanceCorrectionHistory.findMany({
      where: { tenantId: TEST_TENANT, correctionRequestId: correction.id }
    })
    expect(histories.length).toBe(1)
    expect(histories[0].action).toBe('APPROVED')
  })
})
