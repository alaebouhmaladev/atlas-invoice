import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Role } from '@prisma/client'
import { prisma } from '../server/utils/db'
import {
  createUser,
  deactivateUser,
  activateUser,
  changeOwnPassword,
  adminResetPassword
} from '../server/services/userManagement.service'

describe('User Management & Safeguards Unit Tests', () => {
  let superAdminId: string
  let accountantUserId: string

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'staff.accountant@atlasbites.ma' } }).catch(() => {})
    const admin = await prisma.user.upsert({
      where: { email: 'test.admin.main@atlasbites.ma' },
      update: { role: Role.SUPER_ADMIN, isActive: true },
      create: {
        name: 'Test Super Admin Main',
        email: 'test.admin.main@atlasbites.ma',
        passwordHash: 'hashed_secret',
        role: Role.SUPER_ADMIN,
        isActive: true
      }
    })
    superAdminId = admin.id
  })

  afterAll(async () => {
    try {
      if (accountantUserId) {
        await prisma.session.deleteMany({ where: { userId: accountantUserId } })
        await prisma.user.deleteMany({ where: { id: accountantUserId } })
      }
      if (superAdminId) {
        await prisma.session.deleteMany({ where: { userId: superAdminId } })
        await prisma.auditLog.deleteMany({ where: { userId: superAdminId } })
        await prisma.user.deleteMany({ where: { id: superAdminId } })
      }
    } catch {
      // ignore
    }
  })

  it('should create a new staff user with temporary password and mustChangePassword = true', async () => {
    const newUser = await createUser(
      {
        name: 'Accountant Staff',
        email: 'staff.accountant@atlasbites.ma',
        role: 'ACCOUNTANT',
        password: 'TempPassword123!',
        confirmPassword: 'TempPassword123!'
      },
      superAdminId
    )

    accountantUserId = newUser.id
    expect(newUser.id).toBeDefined()
    expect(newUser.mustChangePassword).toBe(true)
    expect(newUser.role).toBe('ACCOUNTANT')
  })

  it('should prevent user from deactivating themselves', async () => {
    await expect(deactivateUser(superAdminId, superAdminId)).rejects.toThrow('Vous ne pouvez pas désactiver votre propre compte')
  })

  it('should prevent deactivating the last active Super Admin', async () => {
    const actorUser = await prisma.user.create({
      data: {
        name: 'Actor User',
        email: `actor.${Date.now()}@atlasbites.ma`,
        passwordHash: 'hashed_secret',
        role: Role.COMMERCIAL,
        isActive: true
      }
    })

    const allOtherAdmins = await prisma.user.findMany({
      where: { role: Role.SUPER_ADMIN, id: { not: superAdminId } }
    })
    const otherAdminIds = allOtherAdmins.map((u) => u.id)

    try {
      await prisma.user.updateMany({
        where: { role: Role.SUPER_ADMIN, id: { not: superAdminId } },
        data: { isActive: false }
      })
      await prisma.user.update({
        where: { id: superAdminId },
        data: { isActive: true }
      })

      await expect(deactivateUser(superAdminId, actorUser.id)).rejects.toThrow('Impossible de désactiver le dernier Super Administrateur actif')
    } finally {
      await prisma.user.delete({ where: { id: actorUser.id } })
      if (otherAdminIds.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: otherAdminIds } },
          data: { isActive: true }
        })
      }
    }
  })

  it('should revoke all active sessions when user is deactivated', async () => {
    // Create a dummy session for accountant
    const session = await prisma.session.create({
      data: {
        tokenHash: 'dummy_hash_token_123',
        userId: accountantUserId,
        expiresAt: new Date(Date.now() + 86400000)
      }
    })

    const updated = await deactivateUser(accountantUserId, superAdminId)
    expect(updated.isActive).toBe(false)

    const remainingSessions = await prisma.session.count({ where: { userId: accountantUserId } })
    expect(remainingSessions).toBe(0)
  })

  it('should allow reactivating an inactive user', async () => {
    const reactivated = await activateUser(accountantUserId, superAdminId)
    expect(reactivated.isActive).toBe(true)
  })

  it('should reset user password via admin reset and set mustChangePassword = true', async () => {
    const result = await adminResetPassword(
      accountantUserId,
      { newPassword: 'NewTempPassword123!', confirmPassword: 'NewTempPassword123!' },
      superAdminId
    )
    expect(result.success).toBe(true)

    const user = await prisma.user.findUnique({ where: { id: accountantUserId } })
    expect(user?.mustChangePassword).toBe(true)
  })

  it('should change own password and set mustChangePassword = false', async () => {
    // Create current session
    const currentSession = await prisma.session.create({
      data: {
        tokenHash: 'current_session_hash',
        userId: accountantUserId,
        expiresAt: new Date(Date.now() + 86400000)
      }
    })

    // Create secondary session that should be revoked
    await prisma.session.create({
      data: {
        tokenHash: 'other_session_hash',
        userId: accountantUserId,
        expiresAt: new Date(Date.now() + 86400000)
      }
    })

    const res = await changeOwnPassword(accountantUserId, currentSession.id, {
      currentPassword: 'NewTempPassword123!',
      newPassword: 'FinalUserSecurePassword2026!',
      confirmPassword: 'FinalUserSecurePassword2026!'
    })

    expect(res.success).toBe(true)

    const user = await prisma.user.findUnique({ where: { id: accountantUserId } })
    expect(user?.mustChangePassword).toBe(false)

    // Verify secondary session was revoked while current session remains
    const sessions = await prisma.session.findMany({ where: { userId: accountantUserId } })
    expect(sessions.length).toBe(1)
    expect(sessions[0].id).toBe(currentSession.id)
  })
})
