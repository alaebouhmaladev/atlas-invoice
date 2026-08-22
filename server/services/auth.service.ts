import crypto from 'node:crypto'
import * as argon2 from 'argon2'
import { prisma } from '../utils/db'
import type { UserPublic } from '~/types/auth'

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText)
  } catch (error) {
    console.error('Argon2 password verification failed:', error)
    return false
  }
}

export async function createSession(userId: string, maxAgeInSeconds: number) {
  const token = generateSessionToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + maxAgeInSeconds * 1000)

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  })

  return { token, session }
}

export async function validateSessionToken(
  token: string
): Promise<{ session: { id: string; userId: string; expiresAt: Date }; user: UserPublic } | null> {
  const tokenHash = hashToken(token)

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          tenantId: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true
        }
      }
    }
  })

  if (!session) {
    return null
  }

  // Check if session has expired
  if (Date.now() >= session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  // Check if user has been deactivated
  if (!session.user.isActive) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  const { user, ...sessionInfo } = session

  return {
    session: sessionInfo,
    user
  }
}

export async function rotateSession(existingToken: string | undefined, userId: string, maxAgeInSeconds: number) {
  if (existingToken) {
    const existingTokenHash = hashToken(existingToken)
    await prisma.session
      .deleteMany({
        where: { tokenHash: existingTokenHash }
      })
      .catch(() => {})
  }

  return createSession(userId, maxAgeInSeconds)
}

export async function invalidateSession(token: string): Promise<void> {
  const tokenHash = hashToken(token)
  await prisma.session
    .deleteMany({
      where: { tokenHash }
    })
    .catch(() => {})
}

export async function updateLastLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() }
  })
}
