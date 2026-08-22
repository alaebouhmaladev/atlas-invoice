import { describe, it, expect } from 'vitest'
import * as argon2 from 'argon2'
import crypto from 'node:crypto'
import { loginSchema } from '../server/utils/validation'
import { loginRateLimiter } from '../server/services/rateLimit.service'
import { createSession, validateSessionToken } from '../server/services/auth.service'
import { prisma } from '../server/utils/db'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function validatePasswordStrength(password: string): boolean {
  if (password.length < 12) return false
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  return hasUpper && hasLower && hasDigit && hasSpecial
}

describe('Authentication & Security Foundation Tests', () => {
  describe('Password Hashing & Verification (Argon2)', () => {
    it('should correctly hash and verify valid passwords with Argon2', async () => {
      const password = 'AtlasSuperSecurePassword2026!'
      const hash = await argon2.hash(password)

      expect(hash).not.toBe(password)
      const isValid = await argon2.verify(hash, password)
      expect(isValid).toBe(true)
    })

    it('should reject invalid passwords during Argon2 verification', async () => {
      const password = 'AtlasSuperSecurePassword2026!'
      const wrongPassword = 'WrongPassword2026!'
      const hash = await argon2.hash(password)

      const isValid = await argon2.verify(hash, wrongPassword)
      expect(isValid).toBe(false)
    })
  })

  describe('Session Token Hashing', () => {
    it('should produce consistent SHA-256 hashes for session tokens', () => {
      const token = '1234567890abcdef1234567890abcdef'
      const hash1 = hashToken(token)
      const hash2 = hashToken(token)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // 256 bits = 64 hex characters
      expect(hash1).not.toBe(token)
    })

    it('propagates the authenticated tenant through session validation', async () => {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const tenantId = `tenant-auth-${stamp}`
      const user = await prisma.user.create({
        data: {
          tenantId,
          name: 'Audit isolation locataire',
          email: `audit-tenant-${stamp}@atlas.test`,
          passwordHash: 'test-only',
          role: 'HR_MANAGER'
        }
      })

      try {
        const { token } = await createSession(user.id, 60)
        const authenticated = await validateSessionToken(token)

        expect(authenticated?.user.id).toBe(user.id)
        expect(authenticated?.user.tenantId).toBe(tenantId)
      } finally {
        await prisma.session.deleteMany({ where: { userId: user.id } })
        await prisma.user.delete({ where: { id: user.id } })
      }
    })
  })

  describe('Super Admin Password Strength Validation', () => {
    it('should approve strong passwords meeting all requirements', () => {
      expect(validatePasswordStrength('StrongP@ssw0rd2026!')).toBe(true)
    })

    it('should reject passwords shorter than 12 characters', () => {
      expect(validatePasswordStrength('Short1!')).toBe(false)
    })

    it('should reject passwords lacking uppercase letters', () => {
      expect(validatePasswordStrength('strongp@ssw0rd2026!')).toBe(false)
    })

    it('should reject passwords lacking numbers', () => {
      expect(validatePasswordStrength('StrongP@sswordSecret!')).toBe(false)
    })

    it('should reject passwords lacking special characters', () => {
      expect(validatePasswordStrength('StrongPassword2026Secret')).toBe(false)
    })
  })

  describe('Zod Login Input Validation', () => {
    it('should validate and normalize valid email and password inputs', () => {
      const input = {
        email: '  ADMIN@ATLASBITES.MA  ',
        password: 'Password123!'
      }
      const result = loginSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('admin@atlasbites.ma')
        expect(result.data.password).toBe('Password123!')
      }
    })

    it('should reject invalid email formats', () => {
      const input = {
        email: 'invalid-email-format',
        password: 'Password123!'
      }
      const result = loginSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Le format de l’adresse email est invalide')
      }
    })

    it('should reject empty passwords', () => {
      const input = {
        email: 'admin@atlasbites.ma',
        password: ''
      }
      const result = loginSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Le mot de passe ne peut pas être vide')
      }
    })
  })

  describe('Rate Limiter Service', () => {
    it('should rate limit key after max attempts', () => {
      const testKey = '127.0.0.1:test@atlasbites.ma'
      loginRateLimiter.reset(testKey)

      expect(loginRateLimiter.isRateLimited(testKey, 3)).toBe(false)

      loginRateLimiter.increment(testKey)
      loginRateLimiter.increment(testKey)
      loginRateLimiter.increment(testKey)

      expect(loginRateLimiter.isRateLimited(testKey, 3)).toBe(true)

      loginRateLimiter.reset(testKey)
      expect(loginRateLimiter.isRateLimited(testKey, 3)).toBe(false)
    })
  })
})
