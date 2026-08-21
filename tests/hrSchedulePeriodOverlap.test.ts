import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { getOrCreateWorkSchedule, getWeekPeriodBoundaries } from '../server/services/hrSchedule.service'
import type { UserPublic } from '~/types/auth'

describe('HR Phase 3 — Canonical Weekly Schedule Period & Overlap Prevention', () => {
  let actor: UserPublic
  let siteId: string

  beforeAll(async () => {
    const timestamp = Date.now()
    const tenantId = `tenant-period-${timestamp}`

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: 'Admin Period Test',
        email: `admin.period.${timestamp}@atlasbites.ma`,
        role: 'SUPER_ADMIN',
        passwordHash: 'hash',
        isActive: true
      }
    })

    actor = {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: true,
      createdAt: user.createdAt
    }

    const site = await prisma.workSite.create({
      data: {
        tenantId,
        code: `SITE-PER-${timestamp}`,
        name: 'Site Canonical Period',
        city: 'Casablanca',
        createdById: user.id
      }
    })
    siteId = site.id
  })

  it('normalizes any mid-week date to canonical UTC Monday start and Sunday end', () => {
    const Wednesday = '2026-08-19' // Wed
    const bounds = getWeekPeriodBoundaries(Wednesday)

    expect(bounds.periodStart.toISOString().slice(0, 10)).toBe('2026-08-17') // Mon
    expect(bounds.periodEnd.toISOString().slice(0, 10)).toBe('2026-08-23') // Sun
  })

  it('returns the same schedule container when requested with different dates within the same week', async () => {
    const sched1 = await getOrCreateWorkSchedule(siteId, '2026-08-17', actor) // Mon
    const sched2 = await getOrCreateWorkSchedule(siteId, '2026-08-20', actor) // Thu

    expect(sched1.id).toBe(sched2.id)

    const count = await prisma.workSchedule.count({
      where: { tenantId: actor.tenantId, siteId, periodStart: sched1.periodStart }
    })
    expect(count).toBe(1)
  })

  it('creates adjacent weekly schedule containers without overlap for consecutive weeks', async () => {
    const week1 = await getOrCreateWorkSchedule(siteId, '2026-08-17', actor)
    const week2 = await getOrCreateWorkSchedule(siteId, '2026-08-24', actor)

    expect(week1.id).not.toBe(week2.id)
    expect(week2.periodStart.getTime()).toBeGreaterThan(week1.periodEnd.getTime())
  })
})
