import { describe, it, expect } from 'vitest'
import { calculateSegmentMinutes } from '../server/services/hrShiftTemplate.service'

describe('HR Phase 3 — Africa/Casablanca Timezone & Shift Segment Calculations', () => {
  it('calculates duration in integer minutes for standard split shifts', () => {
    // 11:00-16:00 (300m) and 18:00-23:00 (300m)
    const seg1 = calculateSegmentMinutes('11:00', '16:00')
    const seg2 = calculateSegmentMinutes('18:00', '23:00')

    expect(seg1).toBe(300)
    expect(seg2).toBe(300)
    expect(seg1 + seg2).toBe(600) // 10 integer hours
  })

  it('calculates duration in integer minutes for overnight shifts crossing midnight', () => {
    // 22:00-06:00 (+1 day)
    const duration = calculateSegmentMinutes('22:00', '06:00', true)
    expect(duration).toBe(480) // 8 integer hours
  })

  it('handles Morocco Africa/Casablanca IANA timezone string formatting', () => {
    const tz = 'Africa/Casablanca'
    const date = new Date('2026-08-17T12:00:00Z')

    const formatter = new Intl.DateTimeFormat('fr-FR', {
      timeZone: tz,
      dateStyle: 'full',
      timeStyle: 'medium'
    })

    const formattedStr = formatter.format(date)
    expect(formattedStr).toBeDefined()
    expect(formattedStr).toContain('2026')
  })
})
