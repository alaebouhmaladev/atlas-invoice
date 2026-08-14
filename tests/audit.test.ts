import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { createAuditEntry, getAuditLogs } from '../server/services/audit.service'

describe('Immutable Audit Log Trail Tests', () => {
  let testUserId: string

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: 'Audit Test User',
        email: `audit_${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
        role: 'SUPER_ADMIN'
      }
    })
    testUserId = user.id
  })

  afterAll(async () => {
    if (testUserId) {
      await prisma.auditLog.deleteMany({ where: { userId: testUserId } })
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
    }
  })

  it('should create audit log entry and scrub secrets from metadata', async () => {
    await createAuditEntry({
      userId: testUserId,
      actorDisplayNameSnapshot: 'Audit Test User',
      actorRoleSnapshot: 'SUPER_ADMIN',
      action: 'USER_PASSWORD_CHANGED',
      category: 'AUTH',
      result: 'SUCCESS',
      metadata: {
        email: 'audit@example.com',
        password: 'SuperSecret123!',
        sessionToken: 'xyz_token_999'
      }
    })

    const { logs } = await getAuditLogs({ userId: testUserId, action: 'USER_PASSWORD_CHANGED' })
    expect(logs.length).toBeGreaterThan(0)
    const entry = logs[0]
    expect(entry.action).toBe('USER_PASSWORD_CHANGED')
    expect(entry.category).toBe('AUTH')
    expect(entry.result).toBe('SUCCESS')

    const metadata = entry.metadata as any
    expect(metadata.password).toBe('[REDACTED]')
    expect(metadata.sessionToken).toBe('[REDACTED]')
    expect(metadata.email).toBe('audit@example.com')
  })
})
