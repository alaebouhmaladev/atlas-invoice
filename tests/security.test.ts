import { describe, it, expect, beforeAll } from 'vitest'
import { loginRateLimiter } from '../server/services/rateLimit.service'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isSameOriginRequestUrl } from '../server/utils/requestSecurity'

describe('SaaS Security Hardening & Headers Tests', () => {
  beforeAll(() => {
    loginRateLimiter.reset('127.0.0.1:test@example.com')
  })

  it('should generate rate limit lockout after consecutive failed login attempts', () => {
    const key = '127.0.0.1:test@example.com'
    loginRateLimiter.reset(key)

    expect(loginRateLimiter.isRateLimited(key)).toBe(false)

    // Simulate 5 failed attempts
    for (let i = 0; i < 5; i++) {
      loginRateLimiter.increment(key)
    }

    expect(loginRateLimiter.isRateLimited(key)).toBe(true)
    loginRateLimiter.reset(key)
    expect(loginRateLimiter.isRateLimited(key)).toBe(false)
  })

  it('does not expose raw dependency errors through public health routes', () => {
    const health = readFileSync(join(process.cwd(), 'server/api/health.get.ts'), 'utf8')
    const readiness = readFileSync(join(process.cwd(), 'server/api/health/ready.get.ts'), 'utf8')

    expect(health).not.toMatch(/error\.message|String\(error\)/)
    expect(readiness).not.toMatch(/err\.message|String\(err\)/)
    expect(readiness).toContain('L’application n’est pas prête à recevoir du trafic')
    expect(readiness).toContain("details.database = 'indisponible'")
    expect(readiness).toContain("details.storage = 'indisponible'")
  })

  it('rejects malformed and cross-origin CSRF source URLs', () => {
    expect(isSameOriginRequestUrl('https://atlas.example/path', 'atlas.example')).toBe(true)
    expect(isSameOriginRequestUrl('https://evil.example/path', 'atlas.example')).toBe(false)
    expect(isSameOriginRequestUrl('not-a-valid-url', 'atlas.example')).toBe(false)
  })

  it('defines frame protection in a single canonical middleware', () => {
    const csrfMiddleware = readFileSync(join(process.cwd(), 'server/middleware/security.ts'), 'utf8')
    const headersMiddleware = readFileSync(join(process.cwd(), 'server/middleware/securityHeaders.ts'), 'utf8')

    expect(csrfMiddleware).not.toContain('X-Frame-Options')
    expect(headersMiddleware).toContain("'X-Frame-Options', 'SAMEORIGIN'")
    expect(headersMiddleware).toContain("frame-ancestors 'self'")
  })
})
