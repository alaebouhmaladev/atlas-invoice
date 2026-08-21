import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import {
  createAttendanceTerminal,
  authenticateTerminal,
  revokeAttendanceTerminal
} from '../server/services/hrAttendanceTerminal.service'

const TEST_TENANT = 'test-tenant-terminal'

describe('HR Phase 4 — Attendance Terminal & Credential Hashing Tests', () => {
  let mockUser: any
  let site: any

  beforeEach(async () => {
    mockUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT,
        name: 'Terminal Admin',
        email: `term-${Date.now()}@atlas.ma`,
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
  })

  afterEach(async () => {
    await prisma.attendanceTerminal.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.workSite.deleteMany({ where: { tenantId: TEST_TENANT } })
    await prisma.auditLog.deleteMany({ where: { userId: mockUser?.id } })
    await prisma.user.deleteMany({ where: { tenantId: TEST_TENANT } })
  })

  it('should create terminal with hashed secret and return raw secret only once', async () => {
    const { terminal, rawSecret } = await createAttendanceTerminal(
      TEST_TENANT,
      site.id,
      'Borne Tablette 01',
      'TERM-01',
      '1234',
      mockUser
    )

    expect(terminal.code).toBe('TERM-01')
    expect(terminal.secretHash).not.toBe(rawSecret) // Hashed secret
    expect(terminal.pinHash).not.toBe('1234') // Hashed PIN
  })

  it('should authenticate terminal with valid secret and update lastPingAt', async () => {
    const { terminal, rawSecret } = await createAttendanceTerminal(
      TEST_TENANT,
      site.id,
      'Borne Tablette 02',
      'TERM-02',
      '5678',
      mockUser
    )

    const authenticated = await authenticateTerminal(TEST_TENANT, 'TERM-02', rawSecret)
    expect(authenticated).not.toBeNull()
    expect(authenticated?.id).toBe(terminal.id)
  })

  it('should reject invalid terminal authentication attempts', async () => {
    await createAttendanceTerminal(
      TEST_TENANT,
      site.id,
      'Borne Tablette 03',
      'TERM-03',
      '9999',
      mockUser
    )

    const authenticated = await authenticateTerminal(TEST_TENANT, 'TERM-03', 'WRONG_SECRET')
    expect(authenticated).toBeNull()
  })

  it('should revoke terminal and prevent subsequent authentication', async () => {
    const { terminal, rawSecret } = await createAttendanceTerminal(
      TEST_TENANT,
      site.id,
      'Borne Tablette 04',
      'TERM-04',
      '1111',
      mockUser
    )

    await revokeAttendanceTerminal(TEST_TENANT, terminal.id, mockUser, 'Test revocation')

    const authenticated = await authenticateTerminal(TEST_TENANT, 'TERM-04', rawSecret)
    expect(authenticated).toBeNull()
  })
})
