import { describe, it, expect, beforeAll } from 'vitest'
import { loginRateLimiter } from '../server/services/rateLimit.service'

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
})
