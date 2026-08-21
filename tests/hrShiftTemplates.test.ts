import { describe, it, expect, beforeAll } from 'vitest'
import { createShiftTemplate, updateShiftTemplate, getShiftTemplates, archiveShiftTemplate, validateSegments, calculateSegmentMinutes } from '../server/services/hrShiftTemplate.service'
import { prisma } from '../server/utils/db'
import type { UserPublic } from '~/types/auth'

const mockUser: UserPublic = {
  id: 'test-admin-id',
  tenantId: 'test-tenant-p3',
  name: 'Admin Test',
  email: 'admin.p3@atlasbites.ma',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: new Date()
}

describe('HR Phase 3 — Shift Templates', () => {
  let siteId: string

  beforeAll(async () => {
    // Ensure test user exists in DB to satisfy foreign keys
    await prisma.user.upsert({
      where: { id: mockUser.id },
      update: { tenantId: mockUser.tenantId },
      create: {
        id: mockUser.id,
        tenantId: mockUser.tenantId,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        passwordHash: 'dummy'
      }
    })

    const site = await prisma.workSite.create({
      data: {
        tenantId: mockUser.tenantId!,
        code: `SITE-TMPL-${Date.now()}`,
        name: 'Site Modèles Test',
        createdById: mockUser.id
      }
    })
    siteId = site.id
  })

  it('calculates segment work minutes correctly', () => {
    expect(calculateSegmentMinutes('08:00', '16:00')).toBe(480) // 8 hours
    expect(calculateSegmentMinutes('18:00', '02:00', true)).toBe(480) // 8 hours overnight
    expect(calculateSegmentMinutes('11:00', '16:00')).toBe(300) // 5 hours
  })

  it('validates overlapping segments correctly', () => {
    expect(() => validateSegments([
      { order: 1, startLocalTime: '11:00', endLocalTime: '16:00' },
      { order: 2, startLocalTime: '15:30', endLocalTime: '21:00' }
    ])).toThrow(/Chevauchement/)
  })

  it('creates normal shift template', async () => {
    const tmpl = await createShiftTemplate({
      siteId,
      code: 'MATIN',
      name: 'Shift Matin Standard',
      color: '#3b82f6',
      segments: [
        { order: 1, startLocalTime: '08:00', endLocalTime: '16:00', segmentType: 'WORK' }
      ]
    }, mockUser)

    expect(tmpl).toBeDefined()
    expect(tmpl?.code).toBe('MATIN')
    expect(tmpl?.segments).toHaveLength(1)
    expect(tmpl?.segments[0].startLocalTime).toBe('08:00')
  })

  it('creates split shift template (coupure)', async () => {
    const tmpl = await createShiftTemplate({
      siteId,
      code: 'COUPURE',
      name: 'Shift Restaurant Coupure',
      color: '#f59e0b',
      segments: [
        { order: 1, startLocalTime: '11:00', endLocalTime: '15:00', segmentType: 'WORK' },
        { order: 2, startLocalTime: '18:00', endLocalTime: '23:00', segmentType: 'WORK' }
      ]
    }, mockUser)

    expect(tmpl).toBeDefined()
    expect(tmpl?.code).toBe('COUPURE')
    expect(tmpl?.segments).toHaveLength(2)
  })

  it('archives shift template', async () => {
    const tmpl = await createShiftTemplate({
      siteId,
      code: 'TEMP',
      name: 'Shift Temporaire',
      segments: [{ order: 1, startLocalTime: '09:00', endLocalTime: '17:00' }]
    }, mockUser)

    const archived = await archiveShiftTemplate(tmpl!.id, mockUser)
    expect(archived.isActive).toBe(false)
    expect(archived.archivedAt).not.toBeNull()

    const activeList = await getShiftTemplates(siteId, mockUser, false)
    expect(activeList.some(t => t.id === tmpl!.id)).toBe(false)
  })
})
