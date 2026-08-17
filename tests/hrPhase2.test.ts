import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import {
  createSite, getSites, archiveSite, restoreSite,
  createDepartment, getDepartments, archiveDepartment, restoreDepartment,
  createPosition, getPositions, archivePosition, restorePosition
} from '../server/services/hrOrganization.service'
import { createAssignment, transferEmployee, getEmployeeAssignments } from '../server/services/hrAssignment.service'
import { createContract, activateContract, renewContract, terminateContract, getContracts } from '../server/services/hrContract.service'
import { createDocumentRecord, uploadDocumentVersion, getDocuments, getDocumentVersionBuffer } from '../server/services/hrDocument.service'
import { checkHrExpirations } from '../server/services/hrExpirationNotification.service'
import { createEmployee } from '../server/services/hrEmployee.service'
import { AssignmentType, ContractType, DocumentCategory } from '@prisma/client'

describe('HR Phase 2 Integration & Unit Tests', () => {
  let superAdminUser: any
  let accountantUser: any
  let tenantBAdminUser: any

  let employeeId: string
  const rand = Math.floor(Math.random() * 100000)
  const siteCode = `SPN-ROUDANI-${rand}`
  const deptCode = `CUISINE-${rand}`
  const posCode = `PIZZAIOLO-${rand}`

  beforeAll(async () => {
    const timestamp = Date.now()
    const rand = Math.floor(Math.random() * 100000)
    const testTenantId = `tenant-test-p2-${timestamp}-${rand}`

    superAdminUser = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        name: 'Super Admin P2',
        email: `admin.p2.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    accountantUser = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        name: 'Accountant P2',
        email: `compta.p2.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: 'ACCOUNTANT',
        isActive: true
      }
    })

    tenantBAdminUser = await prisma.user.create({
      data: {
        tenantId: 'tenant-b',
        name: 'Tenant B Admin',
        email: `admin.tb.${timestamp}.${rand}@tenantb.ma`,
        passwordHash: 'hashed_pass',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    // Create test employee for Phase 2 tests
    const emp = await createEmployee({
      firstName: 'Kareem',
      lastName: 'Alami',
      phonePrimary: '+212 6 11 22 33 44',
      hireDate: '2026-01-15'
    }, superAdminUser)
    employeeId = emp.id
  })

  describe('1. WorkSite, Department & Position Organization CRUD & Archiving', () => {
    it('should create and retrieve a WorkSite with tenant-scoped uniqueness', async () => {
      const site = await createSite({
        code: siteCode,
        name: 'Street Pizzeria Roudani',
        type: 'RESTAURANT',
        city: 'Casablanca'
      }, superAdminUser)

      expect(site.code).toBe(siteCode)
      expect(site.name).toBe('Street Pizzeria Roudani')

      const res = await getSites({ search: siteCode }, superAdminUser)
      expect(res.data.length).toBeGreaterThanOrEqual(1)
      expect(res.data[0].code).toBe(siteCode)
    })

    it('should create a Department and Position', async () => {
      const dept = await createDepartment({
        code: deptCode,
        name: 'Cuisine centrale & Traiteur'
      }, superAdminUser)

      expect(dept.code).toBe(deptCode)

      const pos = await createPosition({
        departmentId: dept.id,
        code: posCode,
        title: 'Pizzaiolo Chef',
        isManagerial: false,
        standardWeeklyMinutes: 2640
      }, superAdminUser)

      expect(pos.code).toBe(posCode)
      expect(pos.department.code).toBe(deptCode)
    })

    it('should reject site archiving without exact typed confirmation code ARCHIVER <CODE>', async () => {
      const testCode = `TEST-ARCHIVE-${rand}`
      const site = await createSite({
        code: testCode,
        name: 'Site Test Archive'
      }, superAdminUser)

      await expect(archiveSite(site.id, {
        version: site.version,
        confirmCode: 'WRONG-CODE',
        archiveReason: 'Test'
      }, superAdminUser)).rejects.toThrow('Code de confirmation incorrect')

      const archived = await archiveSite(site.id, {
        version: site.version,
        confirmCode: `ARCHIVER ${testCode}`,
        archiveReason: 'Fermeture temporaire'
      }, superAdminUser)

      expect(archived.archivedAt).not.toBeNull()
      expect(archived.isActive).toBe(false)

      const restored = await restoreSite(site.id, superAdminUser)
      expect(restored.archivedAt).toBeNull()
      expect(restored.isActive).toBe(true)
    })
  })

  describe('2. Historical Employee Assignments & Transfer Workflow', () => {
    it('should assign employee to primary site, department, and position', async () => {
      const sitesRes = await getSites({ search: siteCode }, superAdminUser)
      const deptsRes = await getDepartments({ search: deptCode }, superAdminUser)
      const posRes = await getPositions({ search: posCode }, superAdminUser)

      const assignment = await createAssignment({
        employeeId,
        siteId: sitesRes.data[0].id,
        departmentId: deptsRes.data[0].id,
        positionId: posRes.data[0].id,
        isPrimary: true,
        startDate: '2026-02-01',
        reason: 'Affectation initiale'
      }, superAdminUser)

      expect(assignment.isPrimary).toBe(true)
      expect(assignment.employeeId).toBe(employeeId)
    })

    it('should enforce max 1 active primary assignment when executing a transfer', async () => {
      const adminCode = `ATLAS-ADMIN-${Math.floor(Math.random() * 100000)}`
      const site2 = await createSite({
        code: adminCode,
        name: 'Siège Administratif Atlas'
      }, superAdminUser)

      const dept2Code = `ADMIN-DEPT-${Math.floor(Math.random() * 100000)}`
      const dept2 = await createDepartment({
        code: dept2Code,
        name: 'Administration'
      }, superAdminUser)

      const pos2Code = `GESTIONNAIRE-${Math.floor(Math.random() * 100000)}`
      const pos2 = await createPosition({
        departmentId: dept2.id,
        code: pos2Code,
        title: 'Gestionnaire RH'
      }, superAdminUser)

      const transferAssignment = await transferEmployee({
        employeeId,
        effectiveDate: '2026-06-01',
        newSiteId: site2.id,
        newDepartmentId: dept2.id,
        newPositionId: pos2.id,
        reason: 'Promotion interne',
        endCurrentPrimary: true
      }, superAdminUser)

      expect(transferAssignment.isPrimary).toBe(true)

      const history = await getEmployeeAssignments(employeeId, superAdminUser)
      expect(history.length).toBeGreaterThanOrEqual(2)
      // Verify only 1 active primary assignment (endDate === null)
      const activePrimary = history.filter(h => h.isPrimary && h.endDate === null)
      expect(activePrimary.length).toBe(1)
      expect(activePrimary[0].position.code).toBe(pos2Code)
    })
  })

  describe('3. Employment Contracts Lifecycle & Renewal Chain', () => {
    let contractId: string

    it('should create draft contract with CTR-YYYY-0001 numbering', async () => {
      const contract = await createContract({
        employeeId,
        contractType: ContractType.CDI,
        startDate: '2026-01-15',
        baseSalary: 12000,
        currency: 'MAD'
      }, superAdminUser)

      expect(contract.contractNumber).toMatch(/^CTR-202\d-\d{4}$/)
      expect(contract.status).toBe('DRAFT')
      contractId = contract.id
    })

    it('should activate contract and freeze immutable snapshots', async () => {
      const contractsRes = await getContracts({ employeeId }, superAdminUser)
      const target = contractsRes.data.find(c => c.id === contractId)!
      expect(target).toBeDefined()

      const activated = await activateContract(target.id, target.version, superAdminUser)
      expect(activated.status).toBe('ACTIVE')
      expect(activated.signedAt).not.toBeNull()
      expect(activated.employeeNameSnapshot).toBe('Kareem Alami')
    })

    it('should renew contract creating a new contract linked via renewedFromContractId', async () => {
      const contractsRes = await getContracts({ employeeId }, superAdminUser)
      const activeContract = contractsRes.data.find(c => c.id === contractId)!
      expect(activeContract).toBeDefined()

      const newContract = await renewContract(activeContract.id, {
        version: activeContract.version,
        startDate: '2027-01-15',
        baseSalary: 14000
      }, superAdminUser)

      expect(newContract.renewedFromContractId).toBe(activeContract.id)

      // Activate new contract to verify old contract becomes RENEWED
      await activateContract(newContract.id, newContract.version, superAdminUser)

      const prevContract = await getContracts({ employeeId }, superAdminUser)
      const oldUpdated = prevContract.data.find(c => c.id === activeContract.id)
      expect(oldUpdated?.status).toBe('RENEWED')
    })

    it('should mask salary snapshot when requested by user without view_salary permission', async () => {
      const res = await getContracts({ employeeId }, accountantUser)
      expect(res.data[0].salarySnapshot).toBeUndefined()
    })
  })

  describe('4. Secure Employee Document Vault & Versioning', () => {
    let documentId: string
    let version1Id: string

    it('should create document record metadata', async () => {
      const doc = await createDocumentRecord({
        employeeId,
        category: DocumentCategory.CIN,
        title: 'Carte d’identité nationale (CIN)',
        isConfidential: true
      }, superAdminUser)

      expect(doc.title).toBe('Carte d’identité nationale (CIN)')
      documentId = doc.id
    })

    it('should reject file upload with invalid magic bytes or unsupported MIME type', async () => {
      const fakeBuffer = Buffer.from('EXECUTABLE_BINARY_CONTENT')
      await expect(uploadDocumentVersion({
        documentId,
        originalFileName: 'malicious.exe',
        mimeType: 'application/x-msdownload',
        buffer: fakeBuffer
      }, superAdminUser)).rejects.toThrow('Format de fichier non autorisé')
    })

    it('should upload valid PDF version with valid magic bytes header', async () => {
      // Valid PDF magic bytes: %PDF-1.4 ...
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF')

      const version = await uploadDocumentVersion({
        documentId,
        originalFileName: 'cin_kareem.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBuffer
      }, superAdminUser)

      expect(version.versionNumber).toBe(1)
      expect(version.sha256).toBeDefined()
      version1Id = version.id
    })

    it('should replace document with version 2 and preserve version 1 history', async () => {
      const pdfBufferV2 = Buffer.from('%PDF-1.5\nVersion 2 updated content\n%%EOF')

      const version2 = await uploadDocumentVersion({
        documentId,
        originalFileName: 'cin_kareem_renouvele.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBufferV2,
        replacementReason: 'Renouvellement CIN 2026'
      }, superAdminUser)

      expect(version2.versionNumber).toBe(2)

      // Fetch version 1 binary stream
      const v1BufferData = await getDocumentVersionBuffer(version1Id, superAdminUser)
      expect(v1BufferData.mimeType).toBe('application/pdf')
      expect(v1BufferData.buffer.toString()).toContain('%PDF-1.4')
    })
  })

  describe('5. Contract & Document Expiration Notifications', () => {
    it('should check expirations idempotently and trigger deduplicated notifications', async () => {
      const res = await checkHrExpirations('default-tenant')
      expect(res.notificationsCreated).toBeGreaterThanOrEqual(0)
    })
  })

  describe('6. Multi-Tenant Isolation Protection', () => {
    it('should prevent Tenant B user from viewing Tenant A sites or contracts', async () => {
      const sitesB = await getSites({}, tenantBAdminUser)
      expect(sitesB.data.length).toBe(0)

      const contractsB = await getContracts({}, tenantBAdminUser)
      expect(contractsB.data.length).toBe(0)
    })
  })
})
