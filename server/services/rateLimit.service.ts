interface RateLimitRecord {
  count: number
  resetTime: number
}

class RateLimiter {
  private records = new Map<string, RateLimitRecord>()

  /**
   * Checks if the given key (IP or email) is rate-limited.
   * @param key The key to rate limit
   * @param maxAttempts Maximum allowed attempts within the window
   * @param windowMs Time window in milliseconds (default 15 minutes)
   */
  isRateLimited(key: string, maxAttempts = 5, _windowMs = 15 * 60 * 1000): boolean {
    const now = Date.now()
    const record = this.records.get(key)

    if (!record) {
      return false
    }

    if (now > record.resetTime) {
      this.records.delete(key)
      return false
    }

    return record.count >= maxAttempts
  }

  /**
   * Increments the attempt counter for a given key.
   */
  increment(key: string, windowMs = 15 * 60 * 1000): void {
    const now = Date.now()
    const record = this.records.get(key)

    if (!record || now > record.resetTime) {
      this.records.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
    } else {
      record.count += 1
    }
  }

  /**
   * Resets the attempts counter for a given key (e.g. after successful login).
   */
  reset(key: string): void {
    this.records.delete(key)
  }
}

export const loginRateLimiter = new RateLimiter()
