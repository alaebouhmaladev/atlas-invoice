import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { runBackup } from '../scripts/backup'
import { createSite, createDepartment, createPosition } from '../server/services/hrOrganization.service'
import { createEmployee } from '../server/services/hrEmployee.service'
import { createAssignment, transferEmployee } from '../server/services/hrAssignment.service'
import { createContract, activateContract, renewContract } from '../server/services/hrContract.service'
import { createDocumentRecord, uploadDocumentVersion, getDocumentVersionBuffer } from '../server/services/hrDocument.service'
import { createAuditEntry } from '../server/services/audit.service'
import { DocumentCategory, ContractType } from '@prisma/client'
import path from 'node:path'
import fs from 'node:fs'
import { createHash } from 'node:crypto'

describe('HR Phase 2 Canonical Asset & Backup/Restore Isolated Verification', () => {
  let superAdminUser: any
  let emp: any
  let version1Sha256: string
  let version2Sha256: string
  let version1Id: string
  let version2Id: string

  beforeAll(async () => {
    const timestamp = Date.now()
    const rand = Math.floor(Math.random() * 100000)

    superAdminUser = await prisma.user.create({
      data: {
        tenantId: 'default-tenant',
        name: 'Super Admin Backup',
        email: `admin.bkp.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    // 1. Structure
    const site = await createSite({ code: `BKP-SITE-${rand}`, name: 'Site Backup Test' }, superAdminUser)
    const dept = await createDepartment({ code: `BKP-DEPT-${rand}`, name: 'Dept Backup Test' }, superAdminUser)
    const pos = await createPosition({ departmentId: dept.id, code: `BKP-POS-${rand}`, title: 'Position Backup' }, superAdminUser)

    // 2. Employee
    emp = await createEmployee({ firstName: 'Noureddine', lastName: 'Bennani', phonePrimary: '+212644444444', hireDate: '2026-01-01' }, superAdminUser)

    // 3. Primary & Historical Assignment
    await createAssignment({
      employeeId: emp.id,
      siteId: site.id,
      departmentId: dept.id,
      positionId: pos.id,
      isPrimary: true,
      startDate: '2026-01-01'
    }, superAdminUser)

    const pos2 = await createPosition({ departmentId: dept.id, code: `BKP-POS2-${rand}`, title: 'Senior Position Backup' }, superAdminUser)
    await transferEmployee({
      employeeId: emp.id,
      effectiveDate: '2026-06-01',
      newSiteId: site.id,
      newDepartmentId: dept.id,
      newPositionId: pos2.id,
      reason: 'Promotion test backup'
    }, superAdminUser)

    // 4. Contract & Renewal Chain
    const contract = await createContract({
      employeeId: emp.id,
      contractType: ContractType.CDI,
      startDate: '2026-01-01',
      baseSalary: 15000
    }, superAdminUser)

    const activeContract = await activateContract(contract.id, contract.version, superAdminUser)

    const renewedContract = await renewContract(activeContract.id, {
      version: activeContract.version,
      startDate: '2027-01-01',
      baseSalary: 17000
    }, superAdminUser)

    await activateContract(renewedContract.id, renewedContract.version, superAdminUser)

    // 5. Document & 2 Immutable Versions
    const doc = await createDocumentRecord({
      employeeId: emp.id,
      category: DocumentCategory.CONTRACT,
      title: 'Contrat de travail signé et avenant'
    }, superAdminUser)

    const bufV1 = Buffer.from('%PDF-1.4\nVersion 1 Content for Backup Test\n%%EOF')
    const v1 = await uploadDocumentVersion({
      documentId: doc.id,
      originalFileName: 'contrat_v1.pdf',
      mimeType: 'application/pdf',
      buffer: bufV1
    }, superAdminUser)

    version1Id = v1.id
    version1Sha256 = v1.sha256

    const bufV2 = Buffer.from('%PDF-1.5\nVersion 2 Content for Backup Test with Avenant\n%%EOF')
    const v2 = await uploadDocumentVersion({
      documentId: doc.id,
      originalFileName: 'contrat_v2.pdf',
      mimeType: 'application/pdf',
      buffer: bufV2,
      replacementReason: 'Avenant de promotion'
    }, superAdminUser)

    version2Id = v2.id
    version2Sha256 = v2.sha256

    // 6. Audit entry
    await createAuditEntry({
      userId: superAdminUser.id,
      action: 'HR_CONTRACT_RENEWED',
      category: 'HR',
      result: 'SUCCESS',
      entityType: 'EmploymentContract',
      entityId: renewedContract.id,
      entityReference: renewedContract.contractNumber
    })
  })

  it('should run full backup generating DB dump and asset archive with SHA-256 checksums', async () => {
    const tmpBackupDir = path.join(process.cwd(), 'tmp', 'test_hr_backups')
    if (fs.existsSync(tmpBackupDir)) {
      fs.rmSync(tmpBackupDir, { recursive: true, force: true })
    }

    await runBackup({ outputDir: tmpBackupDir })

    const manifestPath = path.join(tmpBackupDir, 'manifest.json')
    expect(fs.existsSync(manifestPath)).toBe(true)

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    expect(manifest.success).toBe(true)
    expect(manifest.dbDumpSha256).toBeDefined()
    expect(manifest.assetArchiveSha256).toBeDefined()
  })

  it('should prove canonical asset DB store allows retrieving version 1 binary matching SHA-256', async () => {
    const v1Data = await getDocumentVersionBuffer(version1Id, superAdminUser)
    const computedHash = createHash('sha256').update(v1Data.buffer).digest('hex')

    expect(computedHash).toBe(version1Sha256)
    expect(v1Data.buffer.toString()).toContain('Version 1 Content')
  })

  it('should prove canonical asset DB store allows retrieving version 2 binary matching SHA-256', async () => {
    const v2Data = await getDocumentVersionBuffer(version2Id, superAdminUser)
    const computedHash = createHash('sha256').update(v2Data.buffer).digest('hex')

    expect(computedHash).toBe(version2Sha256)
    expect(v2Data.buffer.toString()).toContain('Version 2 Content')
  })
})
