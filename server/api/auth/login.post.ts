import { defineEventHandler, readBody, getRequestIP, getRequestHeader, createError } from 'h3'
import { prisma } from '../../utils/db'
import { loginSchema } from '../../utils/validation'
import { loginRateLimiter } from '../../services/rateLimit.service'
import { verifyPassword, rotateSession, updateLastLogin } from '../../services/auth.service'
import { setSessionTokenCookie, getSessionTokenCookie } from '../../utils/auth'
import { createAuditEntry } from '../../services/audit.service'
import { createNotification } from '../../services/notification.service'
import { createSanitizedError } from '../../utils/error'
import { createSuccessResponse } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const ipAddress = getRequestIP(event, { xForwardedFor: true }) || '127.0.0.1'
  const userAgent = getRequestHeader(event, 'user-agent')

  // Zod Input Validation
  const validationResult = loginSchema.safeParse(body)
  if (!validationResult.success) {
    const issue = validationResult.error.issues[0]
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: {
        code: 'VALIDATION_ERROR',
        message: issue ? issue.message : 'Les paramètres de la requête sont invalides'
      }
    })
  }

  const { email, password } = validationResult.data
  const rateLimitKey = `${ipAddress}:${email}`

  // Rate Limiting Check
  if (loginRateLimiter.isRateLimited(rateLimitKey)) {
    await createAuditEntry({
      action: 'AUTH_LOGIN_RATE_LIMITED',
      category: 'AUTH',
      result: 'FAILURE',
      metadata: { email, ipAddress },
      ipAddress,
      userAgent,
      event
    })
    await createNotification({
      recipientRole: 'SUPER_ADMIN',
      type: 'SECURITY_RATE_LIMITED',
      severity: 'WARNING',
      title: 'Alerte de sécurité : Tentatives d’accès excessives',
      message: `Plusieurs tentatives de connexion échouées depuis l'adresse IP ${ipAddress} (${email}).`,
      deduplicationKey: `rate_limit:${ipAddress}`
    })
    throw createSanitizedError(event, 429, 'RATE_LIMITED', 'Trop de tentatives. Réessayez dans quelques minutes.')
  }

  // Fetch User
  const user = await prisma.user.findUnique({
    where: { email }
  })

  // Generic Credential Check (prevent email enumeration)
  if (!user) {
    loginRateLimiter.increment(rateLimitKey)
    await createAuditEntry({
      action: 'AUTH_LOGIN_FAILED',
      category: 'AUTH',
      result: 'FAILURE',
      metadata: { email, reason: 'USER_NOT_FOUND' },
      ipAddress,
      userAgent,
      event
    })
    throw createSanitizedError(event, 401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.')
  }

  // Active User Check
  if (!user.isActive) {
    loginRateLimiter.increment(rateLimitKey)
    await createAuditEntry({
      userId: user.id,
      actorDisplayNameSnapshot: user.name,
      actorRoleSnapshot: user.role,
      action: 'AUTH_LOGIN_REJECTED_INACTIVE',
      category: 'AUTH',
      result: 'FAILURE',
      entityType: 'User',
      entityId: user.id,
      metadata: { email },
      ipAddress,
      userAgent,
      event
    })
    throw createSanitizedError(event, 401, 'ACCOUNT_DISABLED', 'Votre compte est désactivé. Contactez un administrateur.')
  }

  // Verify Argon2 Password Hash
  const isValidPassword = await verifyPassword(user.passwordHash, password)
  if (!isValidPassword) {
    loginRateLimiter.increment(rateLimitKey)
    await createAuditEntry({
      userId: user.id,
      actorDisplayNameSnapshot: user.name,
      actorRoleSnapshot: user.role,
      action: 'AUTH_LOGIN_FAILED',
      category: 'AUTH',
      result: 'FAILURE',
      entityType: 'User',
      entityId: user.id,
      metadata: { email, reason: 'INVALID_PASSWORD' },
      ipAddress,
      userAgent,
      event
    })
    throw createSanitizedError(event, 401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.')
  }

  // Reset rate limiter on successful authentication
  loginRateLimiter.reset(rateLimitKey)

  // Rotate Session
  const existingToken = getSessionTokenCookie(event)
  const runtimeConfig = useRuntimeConfig()
  const maxAge = runtimeConfig.sessionMaxAge

  const { token } = await rotateSession(existingToken, user.id, maxAge)

  // Set Secure Cookie
  setSessionTokenCookie(event, token, maxAge)

  // Update Last Login Timestamp
  await updateLastLogin(user.id)

  // Record Audit Log
  await createAuditEntry({
    userId: user.id,
    actorDisplayNameSnapshot: user.name,
    actorRoleSnapshot: user.role,
    action: 'AUTH_LOGIN_SUCCESS',
    category: 'AUTH',
    result: 'SUCCESS',
    entityType: 'User',
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
    ipAddress,
    userAgent,
    event
  })

  const userPublic = {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: new Date().toISOString(),
    createdAt: user.createdAt.toISOString()
  }

  return createSuccessResponse({ user: userPublic })
})
