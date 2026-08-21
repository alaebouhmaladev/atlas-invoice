import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import { getAttendancePolicy, upsertAttendancePolicy } from '../server/services/hrAttendancePolicy.service'

const TEST_TENANT = 'test-tenant-policy'

describe('HR Phase 4 — Attendance Policy Service Tests', () => {
  let mockUser: any

  beforeEach(async () => {
    mockUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'Policy Admin',
        email: `policy-${Date.now()}@atlas.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN'
      }
    })
  })

  afterEach(async () => {
    await prisma.attendancePolicy.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.auditLog.deleteMany({ where: { userId: mockUser?.id } })
    await prisma.user.deleteMany({ where: { tenantId: TEST_TENANT } })
  })

  it('should return default policy fallback if no custom policy exists', async () => {
    const policy = await getAttendancePolicy(TEST_TENANT)
    expect(policy.timezone).toBe('Africa/Casablanca')
    expect(policy.earlyClockInToleranceMinutes).toBe(15)
    expect(policy.lateArrivalToleranceMinutes).toBe(10)
  })

  it('should upsert custom attendance policy and log audit entry', async () => {
    const policy = await upsertAttendancePolicy(
      TEST_TENANT,
      null,
      {
        earlyClockInToleranceMinutes: 20,
        lateArrivalToleranceMinutes: 5,
        overtimeThresholdMinutes: 450
      },
      mockUser
    )

    expect(policy.earlyClockInToleranceMinutes).toBe(20)
    expect(policy.lateArrivalToleranceMinutes).toBe(5)
    expect(policy.overtimeThresholdMinutes).toBe(450)

    const audit = await prisma.auditLog.findFirst({
      where: { userId: mockUser.id, action: 'HR_ATTENDANCE_POLICY_UPDATED' }
    })
    expect(audit).not.toBeNull()
  })
})
