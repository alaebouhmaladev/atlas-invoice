import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { createAssignment, transferEmployee, getEmployeeAssignments, detectManagerCycle } from '../server/services/hrAssignment.service'
import { createSite, createDepartment, createPosition } from '../server/services/hrOrganization.service'
import { createEmployee } from '../server/services/hrEmployee.service'

describe('HR Assignments & Hierarchy Cycle Tests', () => {
  let superAdminUser: any
  let empA: any
  let empB: any
  let empC: any
  let site: any
  let dept: any
  let pos: any
  let testTenantId: string

  beforeAll(async () => {
    const timestamp = Date.now()
    const rand = Math.floor(Math.random() * 100000)
    testTenantId = `tenant-test-assign-${timestamp}-${rand}`

    superAdminUser = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        name: 'Super Admin Assign',
        email: `admin.assign.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    site = await createSite({ code: `SITE-ASSIGN-${rand}`, name: 'Site Assign' }, superAdminUser)
    dept = await createDepartment({ code: `DEPT-ASSIGN-${rand}`, name: 'Dept Assign' }, superAdminUser)
    pos = await createPosition({ departmentId: dept.id, code: `POS-ASSIGN-${rand}`, title: 'Pos Assign' }, superAdminUser)

    empA = await createEmployee({ firstName: 'Ali', lastName: 'Mansouri', phonePrimary: '+212611111111', hireDate: '2026-01-01' }, superAdminUser)
    empB = await createEmployee({ firstName: 'Bilal', lastName: 'Kassimi', phonePrimary: '+212622222222', hireDate: '2026-01-01' }, superAdminUser)
    empC = await createEmployee({ firstName: 'Chaimae', lastName: 'Bennani', phonePrimary: '+212633333333', hireDate: '2026-01-01' }, superAdminUser)
  })

  it('should guarantee maximum 1 active primary assignment per employee', async () => {
    const a1 = await createAssignment({
      employeeId: empA.id,
      siteId: site.id,
      departmentId: dept.id,
      positionId: pos.id,
      isPrimary: true,
      startDate: '2026-01-01'
    }, superAdminUser)

    expect(a1.isPrimary).toBe(true)

    // Second primary assignment ends the previous one
    const a2 = await createAssignment({
      employeeId: empA.id,
      siteId: site.id,
      departmentId: dept.id,
      positionId: pos.id,
      isPrimary: true,
      startDate: '2026-04-01'
    }, superAdminUser)

    const list = await getEmployeeAssignments(empA.id, superAdminUser)
    const activePrimary = list.filter((h: any) => h.isPrimary && h.endDate === null)
    expect(activePrimary.length).toBe(1)
    expect(activePrimary[0].id).toBe(a2.id)
  })

  it('should enforce database-level partial unique index when attempting to create 2 active primary assignments directly', async () => {
    // Direct raw creation bypassing service to trigger DB partial index violation
    await expect(prisma.employeeAssignment.create({
      data: {
        tenantId: testTenantId,
        employeeId: empA.id,
        siteId: site.id,
        departmentId: dept.id,
        positionId: pos.id,
        isPrimary: true,
        startDate: new Date('2026-05-01'),
        endDate: null,
        createdById: superAdminUser.id
      }
    })).rejects.toThrow()
  })

  it('should detect direct self-manager cycle A -> A', async () => {
    const isCycle = await detectManagerCycle(empA.id, empA.id, testTenantId)
    expect(isCycle).toBe(true)

    await expect(createAssignment({
      employeeId: empA.id,
      siteId: site.id,
      departmentId: dept.id,
      positionId: pos.id,
      managerEmployeeId: empA.id,
      isPrimary: true,
      startDate: '2026-06-01'
    }, superAdminUser)).rejects.toThrow('Cette affectation créerait une boucle dans la hiérarchie des responsables.')
  })

  it('should detect 2-level manager cycle A -> B -> A', async () => {
    // Assign B with manager = A
    await createAssignment({
      employeeId: empB.id,
      siteId: site.id,
      departmentId: dept.id,
      positionId: pos.id,
      managerEmployeeId: empA.id,
      isPrimary: true,
      startDate: '2026-01-01'
    }, superAdminUser)

    // Now try to set A's manager = B -> Should create cycle A -> B -> A
    const isCycle = await detectManagerCycle(empA.id, empB.id, testTenantId)
    expect(isCycle).toBe(true)

    await expect(createAssignment({
      employeeId: empA.id,
      siteId: site.id,
      departmentId: dept.id,
      positionId: pos.id,
      managerEmployeeId: empB.id,
      isPrimary: true,
      startDate: '2026-06-01'
    }, superAdminUser)).rejects.toThrow('Cette affectation créerait une boucle dans la hiérarchie des responsables.')
  })

  it('should detect multi-level manager cycle A -> B -> C -> A', async () => {
    // B's manager is A (from previous test)
    // Assign C with manager = B
    await createAssignment({
      employeeId: empC.id,
      siteId: site.id,
      departmentId: dept.id,
      positionId: pos.id,
      managerEmployeeId: empB.id,
      isPrimary: true,
      startDate: '2026-01-01'
    }, superAdminUser)

    // Now try to set A's manager = C -> Cycle: A -> B -> C -> A
    const isCycle = await detectManagerCycle(empA.id, empC.id, testTenantId)
    expect(isCycle).toBe(true)

    await expect(createAssignment({
      employeeId: empA.id,
      siteId: site.id,
      departmentId: dept.id,
      positionId: pos.id,
      managerEmployeeId: empC.id,
      isPrimary: true,
      startDate: '2026-07-01'
    }, superAdminUser)).rejects.toThrow('Cette affectation créerait une boucle dans la hiérarchie des responsables.')
  })
})
