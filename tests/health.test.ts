import { describe, it, expect } from 'vitest'
import { prisma } from '../server/utils/db'

describe('Health Checks Integration Tests', () => {
  it('should successfully execute database query for readiness check', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as alive`
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })
})
