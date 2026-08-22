import { describe, expect, it } from 'vitest'
import { enumerateHrDates, getHrDateRange, parseHrLocalDate, toHrLocalDate } from '../server/utils/hrDates'

describe('HR Phase 5 — canonical HR dates', () => {
  it('normalizes date-only values to a stable UTC database key', () => {
    expect(parseHrLocalDate('2026-08-21').toISOString()).toBe('2026-08-21T00:00:00.000Z')
  })

  it('formats instants using Africa/Casablanca calendar dates', () => {
    expect(toHrLocalDate(new Date('2026-08-20T23:30:00.000Z'))).toBe('2026-08-21')
  })

  it('creates inclusive daily ranges without noon/midnight mismatches', () => {
    const range = getHrDateRange('2026-08-21')
    expect(range.start.toISOString()).toBe('2026-08-21T00:00:00.000Z')
    expect(range.end.toISOString()).toBe('2026-08-21T23:59:59.999Z')
  })

  it('enumerates inclusive request dates and rejects reversed ranges', () => {
    expect(enumerateHrDates('2026-08-21', '2026-08-23')).toEqual([
      '2026-08-21',
      '2026-08-22',
      '2026-08-23'
    ])
    expect(() => enumerateHrDates('2026-08-23', '2026-08-21')).toThrow('date de fin')
  })
})
