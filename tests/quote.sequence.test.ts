import { describe, it, expect } from 'vitest'

function formatSequence(prefix: string, year: number, num: number): string {
  const padded = String(num).padStart(4, '0')
  return `${prefix}-${year}-${padded}`
}

describe('Document Sequence Numbering Tests', () => {
  it('should correctly format sequence number DEV-2026-0001', () => {
    expect(formatSequence('DEV', 2026, 1)).toBe('DEV-2026-0001')
    expect(formatSequence('DEV', 2026, 42)).toBe('DEV-2026-0042')
    expect(formatSequence('DEV', 2026, 9999)).toBe('DEV-2026-9999')
  })

  it('should reset sequence number count for a new calendar year', () => {
    const year2026 = formatSequence('DEV', 2026, 10)
    const year2027 = formatSequence('DEV', 2027, 1)

    expect(year2026).toBe('DEV-2026-0010')
    expect(year2027).toBe('DEV-2027-0001')
  })
})
