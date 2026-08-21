import crypto from 'node:crypto'
import * as argon2 from 'argon2'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import type { UserPublic } from '~/types/auth'

export async function createAttendanceTerminal(
  tenantId: string,
  siteId: string,
  name: string,
  code: string,
  pin: string | null,
  user: UserPublic
) {
  const secretRaw = crypto.randomBytes(24).toString('hex')
  const secretHash = await argon2.hash(secretRaw)
  const pinHash = pin ? await argon2.hash(pin) : null

  const terminal = await prisma.attendanceTerminal.create({
    data: {
      tenantId,
      siteId,
      code,
      name,
      secretHash,
      pinHash,
      isActive: true,
      createdById: user.id
    }
  })

  await createAuditEntry({
    userId: user.id,
    action: 'HR_ATTENDANCE_TERMINAL_CREATED',
    category: 'HR_ATTENDANCE',
    result: 'SUCCESS',
    entityType: 'AttendanceTerminal',
    entityId: terminal.id,
    entityReference: terminal.code,
    metadata: { siteId, code, name }
  })

  // Raw secret is returned ONLY ONCE upon creation
  return {
    terminal,
    rawSecret: secretRaw
  }
}

export async function authenticateTerminal(
  tenantId: string,
  code: string,
  secretOrPin: string
) {
  const terminal = await prisma.attendanceTerminal.findFirst({
    where: {
      tenantId,
      code,
      isActive: true,
      revokedAt: null
    },
    include: {
      site: true
    }
  })

  if (!terminal) {
    await createAuditEntry({
      action: 'HR_ATTENDANCE_UNAUTHORIZED_ACCESS_ATTEMPT',
      category: 'SECURITY',
      result: 'FAILURE',
      entityType: 'AttendanceTerminal',
      entityReference: code,
      metadata: { attemptedCode: code, reason: 'Terminal non trouvé ou révoqué' }
    })
    return null
  }

  // Check secretHash first, then pinHash if present
  let isValid = false
  try {
    isValid = await argon2.verify(terminal.secretHash, secretOrPin)
    if (!isValid && terminal.pinHash) {
      isValid = await argon2.verify(terminal.pinHash, secretOrPin)
    }
  } catch {
    isValid = false
  }

  if (!isValid) {
    await createAuditEntry({
      action: 'HR_ATTENDANCE_UNAUTHORIZED_ACCESS_ATTEMPT',
      category: 'SECURITY',
      result: 'FAILURE',
      entityType: 'AttendanceTerminal',
      entityId: terminal.id,
      entityReference: code,
      metadata: { terminalId: terminal.id, code, reason: 'Secret/PIN invalide' }
    })
    return null
  }

  // Update last ping
  await prisma.attendanceTerminal.update({
    where: { id: terminal.id },
    data: { lastPingAt: new Date() }
  })

  return terminal
}

export async function revokeAttendanceTerminal(
  tenantId: string,
  terminalId: string,
  user: UserPublic,
  reason?: string
) {
  const terminal = await prisma.attendanceTerminal.findFirst({
    where: { id: terminalId, tenantId }
  })

  if (!terminal) {
    const err: any = new Error('Borne de pointage introuvable')
    err.statusCode = 444
    throw err
  }

  const updated = await prisma.attendanceTerminal.update({
    where: { id: terminalId },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedById: user.id
    }
  })

  await createAuditEntry({
    userId: user.id,
    action: 'HR_ATTENDANCE_TERMINAL_REVOKED',
    category: 'HR_ATTENDANCE',
    result: 'SUCCESS',
    entityType: 'AttendanceTerminal',
    entityId: terminal.id,
    entityReference: terminal.code,
    metadata: { reason: reason || 'Révocation manuelle', code: terminal.code }
  })

  await createNotification({
    recipientRole: 'SUPER_ADMIN',
    type: 'TERMINAL_ALERT',
    severity: 'WARNING',
    title: 'Borne de pointage révoquée',
    message: `La borne de pointage (${terminal.name} - ${terminal.code}) a été révoquée par ${user.name}.`,
    actionUrl: '/rh/pointage/parametres'
  })

  return updated
}

export async function getAttendanceTerminals(tenantId: string, siteId?: string) {
  return prisma.attendanceTerminal.findMany({
    where: {
      tenantId,
      ...(siteId ? { siteId } : {})
    },
    include: {
      site: true,
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}
