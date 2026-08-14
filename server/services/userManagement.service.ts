import argon2 from 'argon2'
import { Role } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditLog } from './audit.service'
import {
  userCreateSchema,
  userUpdateSchema,
  changePasswordSchema,
  adminResetPasswordSchema
} from '../utils/validation'

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      passwordChangedAt: true,
      deactivatedAt: true,
      lastLoginAt: true,
      createdAt: true,
      _count: {
        select: { sessions: true }
      }
    }
  })
  return users
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      passwordChangedAt: true,
      deactivatedAt: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { sessions: true }
      }
    }
  })
  if (!user) {
    const error: any = new Error('Utilisateur introuvable')
    error.statusCode = 404
    throw error
  }
  return user
}

export async function createUser(rawInput: any, actorId: string) {
  const data = userCreateSchema.parse(rawInput)

  const existing = await prisma.user.findUnique({
    where: { email: data.email }
  })
  if (existing) {
    const error: any = new Error('Un utilisateur avec cette adresse email existe déjà')
    error.statusCode = 400
    throw error
  }

  const passwordHash = await argon2.hash(data.password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  })

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role as Role,
      isActive: true,
      mustChangePassword: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true
    }
  })

  await createAuditLog({
    userId: actorId,
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: user.id,
    metadata: {
      name: user.name,
      email: user.email,
      role: user.role
    }
  })

  return user
}

export async function updateUser(targetUserId: string, rawInput: any, actorId: string) {
  const data = userUpdateSchema.parse(rawInput)
  const user = await getUserById(targetUserId)

  // Check email uniqueness if changing email
  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      const error: any = new Error('Un utilisateur avec cette adresse email existe déjà')
      error.statusCode = 400
      throw error
    }
  }

  // Check last active Super Admin safeguard before demoting
  if (data.role && data.role !== Role.SUPER_ADMIN && user.role === Role.SUPER_ADMIN) {
    const activeSuperAdmins = await prisma.user.count({
      where: { role: Role.SUPER_ADMIN, isActive: true }
    })
    if (activeSuperAdmins <= 1) {
      const error: any = new Error('Impossible de modifier le rôle du dernier Super Administrateur actif')
      error.statusCode = 400
      throw error
    }
  }

  const isRoleChanged = data.role && data.role !== user.role

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      name: data.name,
      email: data.email,
      role: data.role as Role | undefined
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      updatedAt: true
    }
  })

  if (isRoleChanged) {
    // Revoke sessions on role change
    await prisma.session.deleteMany({ where: { userId: targetUserId } })

    await createAuditLog({
      userId: actorId,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: targetUserId,
      metadata: {
        previousRole: user.role,
        newRole: updated.role
      }
    })
  }

  await createAuditLog({
    userId: actorId,
    action: 'USER_UPDATED',
    entityType: 'User',
    entityId: targetUserId,
    metadata: {
      name: updated.name,
      email: updated.email,
      role: updated.role
    }
  })

  return updated
}

export async function activateUser(targetUserId: string, actorId: string) {
  const user = await getUserById(targetUserId)
  if (user.isActive) return user

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isActive: true,
      deactivatedAt: null,
      deactivatedById: null
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true
    }
  })

  await createAuditLog({
    userId: actorId,
    action: 'USER_ACTIVATED',
    entityType: 'User',
    entityId: targetUserId,
    metadata: { email: user.email }
  })

  return updated
}

export async function deactivateUser(targetUserId: string, actorId: string) {
  if (targetUserId === actorId) {
    const error: any = new Error('Vous ne pouvez pas désactiver votre propre compte')
    error.statusCode = 400
    throw error
  }

  const user = await getUserById(targetUserId)

  // Last active Super Admin safeguard
  if (user.role === Role.SUPER_ADMIN && user.isActive) {
    const activeSuperAdmins = await prisma.user.count({
      where: { role: Role.SUPER_ADMIN, isActive: true }
    })
    if (activeSuperAdmins <= 1) {
      const error: any = new Error('Impossible de désactiver le dernier Super Administrateur actif')
      error.statusCode = 400
      throw error
    }
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedById: actorId
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      deactivatedAt: true
    }
  })

  // Immediately revoke all sessions for deactivated user
  const revoked = await prisma.session.deleteMany({ where: { userId: targetUserId } })

  await createAuditLog({
    userId: actorId,
    action: 'USER_DEACTIVATED',
    entityType: 'User',
    entityId: targetUserId,
    metadata: {
      email: user.email,
      revokedSessionCount: revoked.count
    }
  })

  return updated
}

export async function adminResetPassword(targetUserId: string, rawInput: any, actorId: string) {
  const data = adminResetPasswordSchema.parse(rawInput)
  await getUserById(targetUserId)

  const passwordHash = await argon2.hash(data.newPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  })

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      mustChangePassword: true,
      passwordChangedAt: new Date()
    }
  })

  // Revoke target user's active sessions
  const revoked = await prisma.session.deleteMany({ where: { userId: targetUserId } })

  await createAuditLog({
    userId: actorId,
    action: 'USER_PASSWORD_RESET',
    entityType: 'User',
    entityId: targetUserId,
    metadata: { revokedSessionCount: revoked.count }
  })

  return { success: true }
}

export async function changeOwnPassword(userId: string, currentSessionId: string, rawInput: any) {
  const data = changePasswordSchema.parse(rawInput)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    const error: any = new Error('Utilisateur introuvable')
    error.statusCode = 404
    throw error
  }

  // Verify current password
  const isValid = await argon2.verify(user.passwordHash, data.currentPassword)
  if (!isValid) {
    const error: any = new Error('Le mot de passe actuel est incorrect')
    error.statusCode = 400
    throw error
  }

  const newHash = await argon2.hash(data.newPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordChangedAt: new Date()
    }
  })

  // Revoke all other sessions except current session
  const revoked = await prisma.session.deleteMany({
    where: {
      userId,
      id: { not: currentSessionId }
    }
  })

  await createAuditLog({
    userId,
    action: 'USER_PASSWORD_CHANGED',
    entityType: 'User',
    entityId: userId,
    metadata: { revokedOtherSessions: revoked.count }
  })

  return { success: true }
}

export async function revokeUserSessions(targetUserId: string, actorId: string) {
  await getUserById(targetUserId)

  const revoked = await prisma.session.deleteMany({
    where: { userId: targetUserId }
  })

  await createAuditLog({
    userId: actorId,
    action: 'USER_SESSIONS_REVOKED',
    entityType: 'User',
    entityId: targetUserId,
    metadata: { revokedSessionCount: revoked.count }
  })

  return { revokedCount: revoked.count }
}

export async function listUserSessions(userId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true
    }
  })
  return sessions
}

export async function revokeSingleSession(sessionId: string, userId: string) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId }
  })

  if (!session) {
    const error: any = new Error('Session introuvable')
    error.statusCode = 404
    throw error
  }

  await prisma.session.delete({ where: { id: sessionId } })

  await createAuditLog({
    userId,
    action: 'SESSION_REVOKED',
    entityType: 'Session',
    entityId: sessionId,
    metadata: {}
  })

  return { success: true }
}

export async function logoutOtherSessions(userId: string, currentSessionId: string) {
  const revoked = await prisma.session.deleteMany({
    where: {
      userId,
      id: { not: currentSessionId }
    }
  })

  await createAuditLog({
    userId,
    action: 'LOGOUT_OTHER_SESSIONS',
    entityType: 'User',
    entityId: userId,
    metadata: { revokedCount: revoked.count }
  })

  return { revokedCount: revoked.count }
}
