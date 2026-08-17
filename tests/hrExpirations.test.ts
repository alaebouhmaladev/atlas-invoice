import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { checkHrExpirations } from '../server/services/hrExpirationNotification.service'
import { createSite, createDepartment, createPosition } from '../server/services/hrOrganization.service'
import { createEmployee } from '../server/services/hrEmployee.service'
import { createContract, activateContract } from '../server/services/hrContract.service'
import { createDocumentRecord } from '../server/services/hrDocument.service'
import { ContractType, DocumentCategory } from '@prisma/client'

describe('HR Contract & Document Expiration Notification Automation Tests', () => {
  let superAdminUser: any
  let emp: any
  const testTenant = `tenant-exp-${Date.now()}`

  beforeAll(async () => {
    const timestamp = Date.now()
    const rand = Math.floor(Math.random() * 100000)

    superAdminUser = await prisma.user.create({
      data: {
        tenantId: testTenant,
        name: 'Super Admin Exp',
        email: `admin.exp.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    emp = await createEmployee({ firstName: 'Tarik', lastName: 'Mansour', phonePrimary: '+212655555555', hireDate: '2026-01-01' }, superAdminUser)

    // Create contract expiring in 15 days
    const exp15Date = new Date()
    exp15Date.setDate(exp15Date.getDate() + 15)

    const contract = await createContract({
      employeeId: emp.id,
      contractType: ContractType.CDD,
      startDate: '2026-01-01',
      endDate: exp15Date.toISOString().split('T')[0],
      baseSalary: 8000
    }, superAdminUser)

    await activateContract(contract.id, contract.version, superAdminUser)

    // Create document expiring in 7 days
    const exp7Date = new Date()
    exp7Date.setDate(exp7Date.getDate() + 7)

    await createDocumentRecord({
      employeeId: emp.id,
      category: DocumentCategory.WORK_PERMIT,
      title: 'Autorisation de travail temporaire',
      expirationDate: exp7Date.toISOString().split('T')[0]
    }, superAdminUser)
  })

  it('should run expiration check idempotently without creating duplicate notifications on repeated execution', async () => {
    const run1 = await checkHrExpirations(testTenant)
    expect(run1.notificationsCreated).toBeGreaterThanOrEqual(1)

    // Second execution immediately after should not create duplicate notifications due to deduplication keys
    const run2 = await checkHrExpirations(testTenant)
    expect(run2.notificationsCreated).toBe(0)
  })
})
