import { describe, it, expect, beforeAll } from 'vitest'
import { requireSiteManagerPermission } from '../server/utils/hrPermissions'
import { createSite } from '../server/services/hrOrganization.service'
import { createEmployee } from '../server/services/hrEmployee.service'
import { prisma } from '../server/utils/db'
import type { UserPublic } from '~/types/auth'

describe('HR Phase 3 — Site Manager Scope & Security RBAC Tests', () => {
  let siteAId: string
  let siteBId: string
  let siteManagerUser: UserPublic
  let unauthorizedUser: UserPublic

  beforeAll(async () => {
    const timestamp = Date.now()
    const tenantId = `tenant-rbac-${timestamp}`

    const mgrUserDb = await prisma.user.create({
      data: {
        tenantId,
        name: 'Manager Site A',
        email: `mgr.sitea.${timestamp}@atlasbites.ma`,
        role: 'SUPER_ADMIN',
        passwordHash: 'test-hash',
        isActive: true
      }
    })

    siteManagerUser = {
      id: mgrUserDb.id,
      tenantId: mgrUserDb.tenantId,
      name: mgrUserDb.name,
      email: mgrUserDb.email,
      role: mgrUserDb.role,
      isActive: true,
      createdAt: mgrUserDb.createdAt
    }

    const unauthDb = await prisma.user.create({
      data: {
        tenantId,
        name: 'User Other',
        email: `other.${timestamp}@atlasbites.ma`,
        role: 'COMMERCIAL',
        passwordHash: 'test-hash',
        isActive: true
      }
    })

    unauthorizedUser = {
      id: unauthDb.id,
      tenantId: unauthDb.tenantId,
      name: unauthDb.name,
      email: unauthDb.email,
      role: unauthDb.role,
      isActive: true,
      createdAt: unauthDb.createdAt
    }

    const siteA = await createSite({
      code: `SITE-RBAC-A-${timestamp}`,
      name: 'Site A Managed',
      city: 'Casablanca'
    }, siteManagerUser)
    siteAId = siteA.id

    const siteB = await createSite({
      code: `SITE-RBAC-B-${timestamp}`,
      name: 'Site B Unmanaged',
      city: 'Rabat'
    }, siteManagerUser)
    siteBId = siteB.id

    const emp = await createEmployee({
      firstName: 'Manager',
      lastName: 'SiteA',
      phonePrimary: `+2126${timestamp.toString().slice(-8)}`,
      hireDate: '2024-01-01',
      linkedUserId: siteManagerUser.id
    }, siteManagerUser)

    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        managedSites: { connect: [{ id: siteAId }] }
      }
    })
  })

  it('allows Site Manager to access their assigned managed site', async () => {
    const fakeEvent = { context: { user: siteManagerUser } }
    const res = await requireSiteManagerPermission(fakeEvent, siteAId, 'hr.schedule.read')
    expect(res.id).toBe(siteManagerUser.id)
  })

  it('blocks Site Manager from accessing another site they do not manage', async () => {
    const mgrUser: UserPublic = { ...siteManagerUser, role: 'ACCOUNTANT' }
    const fakeEvent = { context: { user: mgrUser } }
    await expect(requireSiteManagerPermission(fakeEvent, siteBId, 'hr.schedule.read'))
      .rejects.toThrow(`Accès non autorisé au site de travail (${siteBId}).`)
  })

  it('blocks unauthorized role from accessing any site schedule', async () => {
    const fakeEvent = { context: { user: unauthorizedUser } }
    await expect(requireSiteManagerPermission(fakeEvent, siteAId, 'hr.schedule.read'))
      .rejects.toThrow()
  })
})
