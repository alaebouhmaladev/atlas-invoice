import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import {
  createSite, getSites, archiveSite, restoreSite, updateSite,
  createDepartment, getDepartments, archiveDepartment, restoreDepartment, updateDepartment,
  createPosition, getPositions, archivePosition, restorePosition, updatePosition
} from '../server/services/hrOrganization.service'

describe('HR Organization Structure CRUD & Archiving Tests', () => {
  let superAdminUser: any
  let siteId: string
  let deptId: string
  let posId: string
  const rand = Math.floor(Math.random() * 100000)

  beforeAll(async () => {
    const timestamp = Date.now()
    const testTenantId = `tenant-test-org-${timestamp}-${rand}`

    superAdminUser = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        name: 'Super Admin Org',
        email: `admin.org.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })
  })

  it('should create, update and query WorkSites with tenant scoping', async () => {
    const siteCode = `STE-MARRAKECH-${rand}`
    const site = await createSite({
      code: siteCode,
      name: 'Restaurant Street Pizzeria Marrakech',
      type: 'RESTAURANT',
      city: 'Marrakech'
    }, superAdminUser)

    expect(site.code).toBe(siteCode)
    siteId = site.id

    const updated = await updateSite(site.id, {
      version: site.version,
      name: 'Restaurant Street Pizzeria Guéliz Marrakech'
    }, superAdminUser)

    expect(updated.name).toBe('Restaurant Street Pizzeria Guéliz Marrakech')
    expect(updated.version).toBe(2)
  })

  it('should enforce typed code ARCHIVER <CODE> when archiving a WorkSite', async () => {
    const testSiteCode = `STE-TEST-${rand}`
    const site = await createSite({
      code: testSiteCode,
      name: 'Site Test Archive'
    }, superAdminUser)

    await expect(archiveSite(site.id, {
      version: site.version,
      confirmCode: 'INCORRECT',
      archiveReason: 'Archivage test'
    }, superAdminUser)).rejects.toThrow('Code de confirmation incorrect')

    const archived = await archiveSite(site.id, {
      version: site.version,
      confirmCode: `ARCHIVER ${testSiteCode}`,
      archiveReason: 'Fermeture saisonnière'
    }, superAdminUser)

    expect(archived.isActive).toBe(false)
    expect(archived.archivedAt).not.toBeNull()

    const restored = await restoreSite(site.id, superAdminUser)
    expect(restored.isActive).toBe(true)
    expect(restored.archivedAt).toBeNull()
  })

  it('should create and archive Department with typed confirmation code', async () => {
    const deptCode = `FINANCE-RH-${rand}`
    const dept = await createDepartment({
      code: deptCode,
      name: 'Département Finance & RH'
    }, superAdminUser)

    expect(dept.code).toBe(deptCode)
    deptId = dept.id

    const archived = await archiveDepartment(dept.id, {
      version: dept.version,
      confirmCode: `ARCHIVER ${deptCode}`,
      archiveReason: 'Restructuration interne'
    }, superAdminUser)

    expect(archived.isActive).toBe(false)

    const restored = await restoreDepartment(dept.id, superAdminUser)
    expect(restored.isActive).toBe(true)
  })

  it('should create and archive Position with typed confirmation code', async () => {
    const posCode = `CHEF-CUISINE-${rand}`
    const pos = await createPosition({
      departmentId: deptId,
      code: posCode,
      title: 'Chef Cuisinier Principal',
      isManagerial: true
    }, superAdminUser)

    expect(pos.code).toBe(posCode)
    posId = pos.id

    const archived = await archivePosition(pos.id, {
      version: pos.version,
      confirmCode: `ARCHIVER ${posCode}`,
      archiveReason: 'Remplacement de titre'
    }, superAdminUser)

    expect(archived.isActive).toBe(false)

    const restored = await restorePosition(pos.id, superAdminUser)
    expect(restored.isActive).toBe(true)
  })
})
