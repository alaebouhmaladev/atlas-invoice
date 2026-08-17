import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { createContract, activateContract, renewContract, terminateContract, getContracts, generateNextContractNumber } from '../server/services/hrContract.service'
import { createEmployee } from '../server/services/hrEmployee.service'
import { ContractType } from '@prisma/client'

describe('HR Contracts Lifecycle & Concurrency Tests', () => {
  let superAdminTenantA: any
  let superAdminTenantB: any
  let accountantUser: any
  let empA: any
  let empB: any
  const tenantA = `tenant-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const tenantB = `tenant-b-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  beforeAll(async () => {
    const timestamp = Date.now()
    const rand = Math.floor(Math.random() * 100000)

    superAdminTenantA = await prisma.user.create({
      data: {
        tenantId: tenantA,
        name: 'Admin Alpha',
        email: `admin.alpha.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    superAdminTenantB = await prisma.user.create({
      data: {
        tenantId: tenantB,
        name: 'Admin Beta',
        email: `admin.beta.${timestamp}.${rand}@tenantb.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    accountantUser = await prisma.user.create({
      data: {
        tenantId: tenantA,
        name: 'Compta Alpha',
        email: `compta.alpha.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hash',
        role: 'ACCOUNTANT',
        isActive: true
      }
    })

    empA = await createEmployee({ firstName: 'Fatima', lastName: 'Zahra', phonePrimary: '+212611111111', hireDate: '2026-01-01' }, superAdminTenantA)
    empB = await createEmployee({ firstName: 'Youssef', lastName: 'Idrissi', phonePrimary: '+212622222222', hireDate: '2026-01-01' }, superAdminTenantB)
  })

  it('should support tenant-isolated sequence numbers (both Tenant A and Tenant B get CTR-2026-0001)', async () => {
    const numA = await generateNextContractNumber(tenantA)
    const numB = await generateNextContractNumber(tenantB)

    const year = new Date().getFullYear()
    expect(numA).toBe(`CTR-${year}-0001`)
    expect(numB).toBe(`CTR-${year}-0001`)
  })

  it('should execute parallel contract number generation without duplicating numbers inside tenant', async () => {
    const numbers = await Promise.all([
      generateNextContractNumber(tenantA),
      generateNextContractNumber(tenantA),
      generateNextContractNumber(tenantA)
    ])

    const uniqueNumbers = new Set(numbers)
    expect(uniqueNumbers.size).toBe(3)
  })

  it('should create draft contract and enforce state machine transitions', async () => {
    const contract = await createContract({
      employeeId: empA.id,
      contractType: ContractType.CDD,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      baseSalary: 9500
    }, superAdminTenantA)

    expect(contract.status).toBe('DRAFT')

    // Activate contract
    const activated = await activateContract(contract.id, contract.version, superAdminTenantA)
    expect(activated.status).toBe('ACTIVE')
    expect(activated.signedAt).not.toBeNull()

    // Renew contract
    const renewedDraft = await renewContract(contract.id, {
      version: activated.version,
      startDate: '2027-01-01',
      baseSalary: 11000
    }, superAdminTenantA)

    expect(renewedDraft.status).toBe('DRAFT')
    expect(renewedDraft.renewedFromContractId).toBe(contract.id)

    // Activate renewed contract -> automatically updates previous contract to RENEWED
    await activateContract(renewedDraft.id, renewedDraft.version, superAdminTenantA)

    const list = await getContracts({ employeeId: empA.id }, superAdminTenantA)
    const prevContract = list.data.find(c => c.id === contract.id)
    expect(prevContract?.status).toBe('RENEWED')
  })

  it('should mask salary snapshot for Accountant role without hr.contract.view_salary permission', async () => {
    const res = await getContracts({ employeeId: empA.id }, accountantUser)
    expect((res.data[0] as any).baseSalary).toBeUndefined()
    expect((res.data[0] as any).salarySnapshot).toBeUndefined()
  })

  it('should terminate active contract requiring date and reason', async () => {
    const contract = await createContract({
      employeeId: empA.id,
      contractType: ContractType.CDI,
      startDate: '2026-01-01',
      baseSalary: 12000
    }, superAdminTenantA)

    const active = await activateContract(contract.id, contract.version, superAdminTenantA)

    const terminated = await terminateContract(active.id, {
      version: active.version,
      terminatedAt: '2026-08-01',
      terminationReason: 'Rupture conventionnelle du contrat'
    }, superAdminTenantA)

    expect(terminated.status).toBe('TERMINATED')
    expect(terminated.endDate).toBeDefined()
  })
})
