import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import {
  generateAttendanceCsvBuffer,
  generateAttendancePdfBuffer
} from '../server/services/hrAttendanceExport.service'

const TEST_TENANT = 'test-tenant-export'

describe('HR Phase 4 — Attendance Export & Privacy Filtering Tests', () => {
  let mockUser: any
  let employee: any
  let site: any

  beforeEach(async () => {
    mockUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'Export Admin',
        email: `exp-${Date.now()}@atlas.ma`,
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
        employeeNumber: '=CMD|"/C calc"!A0', // Formula injection attempt
        firstName: 'Hassan',
        lastName: 'Idrissi',
        displayName: 'Hassan Idrissi',
        phonePrimary: '+212600000006',
        hireDate: new Date('2026-01-01'),
        cinEncrypted: 'SECRET_CIN',
        cnssNumberEncrypted: 'SECRET_CNSS',
        ribEncrypted: 'SECRET_RIB',
        createdById: mockUser.id
      }
    })

    await prisma.attendanceDay.create({
      data: {
        tenantId: TEST_TENANT,
        employeeId: employee.id,
        siteId: site.id,
        workDate: new Date('2026-08-20T00:00:00.000Z'),
        plannedMinutes: 480,
        netWorkedMinutes: 480
      }
    })
  })

  afterEach(async () => {
    await prisma.attendanceDay.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.employee.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.workSite.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.user.deleteMany({ where: { tenantId: TEST_TENANT } })
  })

  it('should escape CSV cell starting with formula triggers (=, +, -, @)', async () => {
    const csvBuffer = await generateAttendanceCsvBuffer(TEST_TENANT)
    const csvStr = csvBuffer.toString('utf-8')

    expect(csvStr).toContain("'=CMD|\"\"/C calc\"\"!A0")
    expect(csvStr).not.toContain('"=CMD|"/C')
  })

  it('should generate valid PDF buffer without exposing sensitive CIN, CNSS, or RIB values', async () => {
    const pdfBuffer = await generateAttendancePdfBuffer(TEST_TENANT)
    expect(pdfBuffer).toBeInstanceOf(Buffer)
    expect(pdfBuffer.length).toBeGreaterThan(1000)

    const pdfContent = pdfBuffer.toString('utf-8')
    expect(pdfContent).not.toContain('SECRET_CIN')
    expect(pdfContent).not.toContain('SECRET_CNSS')
    expect(pdfContent).not.toContain('SECRET_RIB')
  })
})
