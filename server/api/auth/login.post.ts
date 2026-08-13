import { defineEventHandler, readBody, getRequestIP, getRequestHeader, createError } from 'h3'
import { prisma } from '../../utils/db'
import { loginSchema } from '../../utils/validation'
import { loginRateLimiter } from '../../services/rateLimit.service'
import { verifyPassword, rotateSession, updateLastLogin } from '../../services/auth.service'
import { setSessionTokenCookie, getSessionTokenCookie } from '../../utils/auth'
import { createAuditLog } from '../../services/audit.service'
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
      statusMessage: 'Bad Request',
      data: {
        code: 'VALIDATION_ERROR',
        message: issue ? issue.message : 'Invalid request parameters'
      }
    })
  }

  const { email, password } = validationResult.data
  const rateLimitKey = `${ipAddress}:${email}`

  // Rate Limiting Check
  if (loginRateLimiter.isRateLimited(rateLimitKey)) {
    await createAuditLog({
      action: 'AUTH_LOGIN_RATE_LIMITED',
      metadata: { email, ipAddress },
      ipAddress,
      userAgent
    })
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: {
        code: 'RATE_LIMITED',
        message: 'Too many failed login attempts. Please try again after 15 minutes.'
      }
    })
  }

  // Fetch User
  const user = await prisma.user.findUnique({
    where: { email }
  })

  // Generic Credential Check (prevent email enumeration)
  if (!user) {
    loginRateLimiter.increment(rateLimitKey)
    await createAuditLog({
      action: 'AUTH_LOGIN_FAILED',
      metadata: { email, reason: 'USER_NOT_FOUND' },
      ipAddress,
      userAgent
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    })
  }

  // Active User Check
  if (!user.isActive) {
    loginRateLimiter.increment(rateLimitKey)
    await createAuditLog({
      userId: user.id,
      action: 'AUTH_LOGIN_REJECTED_INACTIVE',
      entityType: 'User',
      entityId: user.id,
      metadata: { email },
      ipAddress,
      userAgent
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: {
        code: 'ACCOUNT_DISABLED',
        message: 'Your account is deactivated. Please contact a Super Administrator.'
      }
    })
  }

  // Verify Argon2 Password Hash
  const isValidPassword = await verifyPassword(user.passwordHash, password)
  if (!isValidPassword) {
    loginRateLimiter.increment(rateLimitKey)
    await createAuditLog({
      userId: user.id,
      action: 'AUTH_LOGIN_FAILED',
      entityType: 'User',
      entityId: user.id,
      metadata: { email, reason: 'INVALID_PASSWORD' },
      ipAddress,
      userAgent
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    })
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
  await createAuditLog({
    userId: user.id,
    action: 'AUTH_LOGIN_SUCCESS',
    entityType: 'User',
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
    ipAddress,
    userAgent
  })

  const userPublic = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: new Date().toISOString(),
    createdAt: user.createdAt.toISOString()
  }

  return createSuccessResponse({ user: userPublic })
})
