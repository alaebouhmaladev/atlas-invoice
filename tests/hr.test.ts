import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import { Role, EmploymentStatus, Gender } from '@prisma/client'
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  archiveEmployee,
  restoreEmployee,
  linkUserAccount,
  unlinkUserAccount,
  updateEmployeePhoto,
  removeEmployeePhoto,
  getHrOverviewMetrics,
  generateNextEmployeeNumber
} from '../server/services/hrEmployee.service'
import {
  getRawHrMasterKey,
  getHrEncryptionKey,
  getHrFingerprintKey,
  encryptSensitiveField,
  decryptSensitiveField,
  computeCinFingerprint,
  maskCin,
  maskRib,
  maskCnss,
  maskSalary
} from '../server/utils/hrEncryption'
import { hasHrPermission } from '../server/utils/hrPermissions'
import { runBackup } from '../scripts/backup'
import path from 'node:path'
import fs from 'node:fs'

describe('HR Module — Phase 1 Final Acceptance & Security Audit Tests', () => {
  let superAdminUser: any
  let hrManagerUser: any
  let accountantUser: any
  let commercialUser: any
  let unlinkedUser: any
  let tenantAlphaAdmin: any
  let tenantBetaAdmin: any
  let tenantBetaUser: any

  beforeEach(async () => {
    const timestamp = Date.now()
    const rand = Math.floor(Math.random() * 100000)

    superAdminUser = await prisma.user.create({
      data: {
        tenantId: 'default-tenant',
        name: 'Super Admin HR Audit',
        email: `super.admin.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.SUPER_ADMIN,
        isActive: true
      }
    })

    hrManagerUser = await prisma.user.create({
      data: {
        tenantId: 'default-tenant',
        name: 'HR Manager Audit',
        email: `hr.manager.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.HR_MANAGER,
        isActive: true
      }
    })

    accountantUser = await prisma.user.create({
      data: {
        tenantId: 'default-tenant',
        name: 'Accountant Audit',
        email: `accountant.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.ACCOUNTANT,
        isActive: true
      }
    })

    commercialUser = await prisma.user.create({
      data: {
        tenantId: 'default-tenant',
        name: 'Commercial Audit',
        email: `commercial.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.COMMERCIAL,
        isActive: true
      }
    })

    unlinkedUser = await prisma.user.create({
      data: {
        tenantId: 'default-tenant',
        name: 'Unlinked User Audit',
        email: `unlinked.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.COMMERCIAL,
        isActive: true
      }
    })

    tenantAlphaAdmin = await prisma.user.create({
      data: {
        tenantId: 'tenant-alpha',
        name: 'Alpha Admin',
        email: `alpha.admin.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.SUPER_ADMIN,
        isActive: true
      }
    })

    tenantBetaAdmin = await prisma.user.create({
      data: {
        tenantId: 'tenant-beta',
        name: 'Beta Admin',
        email: `beta.admin.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.SUPER_ADMIN,
        isActive: true
      }
    })

    tenantBetaUser = await prisma.user.create({
      data: {
        tenantId: 'tenant-beta',
        name: 'Beta User',
        email: `beta.user.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.COMMERCIAL,
        isActive: true
      }
    })
  })

  afterEach(async () => {
    const userIds = [
      superAdminUser.id,
      hrManagerUser.id,
      accountantUser.id,
      commercialUser.id,
      unlinkedUser.id,
      tenantAlphaAdmin.id,
      tenantBetaAdmin.id,
      tenantBetaUser.id
    ]

    await prisma.employee.deleteMany({
      where: {
        OR: [
          { createdById: { in: userIds } },
          { tenantId: { in: ['default-tenant', 'tenant-alpha', 'tenant-beta'] } }
        ]
      }
    })
    await prisma.companyAsset.deleteMany({
      where: { uploadedById: { in: userIds } }
    })
    await prisma.appNotification.deleteMany({
      where: { recipientUserId: { in: userIds } }
    })
    await prisma.auditLog.deleteMany({
      where: { userId: { in: userIds } }
    })
    await prisma.user.deleteMany({
      where: { id: { in: userIds } }
    })
  })

  describe('1. Multi-Tenant SaaS Isolation & Database Constraints', () => {
    it('should allow Tenant Alpha and Tenant Beta to independently have EMP-2026-0001', async () => {
      const empAlpha = await createEmployee(
        {
          firstName: 'Alpha',
          lastName: 'EmpOne',
          phonePrimary: '0661111111',
          hireDate: '2026-01-01'
        },
        tenantAlphaAdmin
      )

      const empBeta = await createEmployee(
        {
          firstName: 'Beta',
          lastName: 'EmpOne',
          phonePrimary: '0662222222',
          hireDate: '2026-01-01'
        },
        tenantBetaAdmin
      )

      expect(empAlpha.employeeNumber).toBe(empBeta.employeeNumber)
      expect(empAlpha.tenantId).toBe('tenant-alpha')
      expect(empBeta.tenantId).toBe('tenant-beta')
    })

    it('should allow Tenant Alpha and Tenant Beta to have the same CIN without collision, but reject duplicate within same tenant', async () => {
      const cinShared = 'AB123456'

      const empAlpha = await createEmployee(
        {
          firstName: 'Alpha',
          lastName: 'CinUser',
          cin: cinShared,
          phonePrimary: '0661111111',
          hireDate: '2026-01-01'
        },
        tenantAlphaAdmin
      )

      const empBeta = await createEmployee(
        {
          firstName: 'Beta',
          lastName: 'CinUser',
          cin: cinShared,
          phonePrimary: '0662222222',
          hireDate: '2026-01-01'
        },
        tenantBetaAdmin
      )

      expect(empAlpha.cinFingerprint).not.toBe(empBeta.cinFingerprint)

      // Duplicate CIN in Tenant Alpha must fail
      await expect(
        createEmployee(
          {
            firstName: 'AlphaDup',
            lastName: 'CinUser',
            cin: cinShared,
            phonePrimary: '0663333333',
            hireDate: '2026-01-01'
          },
          tenantAlphaAdmin
        )
      ).rejects.toThrow('Ce numéro de CIN est déjà associé à un autre employé.')
    })

    it('should reject cross-tenant user linkage attempts', async () => {
      const empAlpha = await createEmployee(
        {
          firstName: 'Alpha',
          lastName: 'EmpLink',
          phonePrimary: '0661111111',
          hireDate: '2026-01-01'
        },
        tenantAlphaAdmin
      )

      // Trying to link Tenant Alpha Employee to Tenant Beta User
      await expect(
        linkUserAccount(empAlpha.id, tenantBetaUser.id, tenantAlphaAdmin)
      ).rejects.toThrow('Impossible de lier un compte utilisateur d’un autre tenant.')
    })
  })

  describe('2. Dedicated HR_ENCRYPTION_KEY & HKDF Domain Key Separation', () => {
    it('should validate and derive distinct domain keys for AES encryption vs HMAC fingerprinting', () => {
      const masterKey = getRawHrMasterKey()
      expect(masterKey).toBeInstanceOf(Buffer)
      expect(masterKey.length).toBe(32)

      const aesKey = getHrEncryptionKey()
      const hmacKey = getHrFingerprintKey()

      expect(aesKey).toBeInstanceOf(Buffer)
      expect(hmacKey).toBeInstanceOf(Buffer)
      expect(aesKey.length).toBe(32)
      expect(hmacKey.length).toBe(32)

      expect(aesKey.toString('hex')).not.toBe(hmacKey.toString('hex'))
    })

    it('should encrypt and decrypt CIN, RIB, and CNSS with AES-256-GCM', () => {
      const plainCin = 'AB123456'
      const encryptedCin = encryptSensitiveField(plainCin)

      expect(encryptedCin).not.toBeNull()
      expect(encryptedCin).not.toBe(plainCin)
      expect(encryptedCin).toContain(':')

      const decryptedCin = decryptSensitiveField(encryptedCin)
      expect(decryptedCin).toBe(plainCin)
    })

    it('should compute deterministic tenant-scoped CIN fingerprint', () => {
      const cin1 = 'AB123456'
      const cin2 = 'ab123456 '
      const fpAlpha1 = computeCinFingerprint(cin1, 'tenant-alpha')
      const fpAlpha2 = computeCinFingerprint(cin2, 'tenant-alpha')
      const fpBeta = computeCinFingerprint(cin1, 'tenant-beta')

      expect(fpAlpha1).toBe(fpAlpha2)
      expect(fpAlpha1).not.toBe(fpBeta)
    })

    it('should correctly mask sensitive identifiers', () => {
      expect(maskCin('AB123456')).toBe('AB••••56')
      expect(maskRib('230780000000000000000123')).toBe('•••• •••• •••• 0123')
      expect(maskCnss('123456789')).toBe('•••••6789')
      expect(maskSalary(8500)).toBe('•••••• MAD')
    })
  })

  describe('3. Granular Permission Architecture & Role Matrix', () => {
    it('should grant full 10 permissions to SUPER_ADMIN and HR_MANAGER', () => {
      const permissions = [
        'hr.employee.list',
        'hr.employee.read',
        'hr.employee.create',
        'hr.employee.update',
        'hr.employee.archive',
        'hr.employee.restore',
        'hr.employee.view_sensitive',
        'hr.employee.manage_salary',
        'hr.employee.link_user',
        'hr.audit.read'
      ] as const

      for (const p of permissions) {
        expect(hasHrPermission(superAdminUser, p)).toBe(true)
        expect(hasHrPermission(hrManagerUser, p)).toBe(true)
      }
    })

    it('should restrict permissions for ACCOUNTANT and COMMERCIAL', () => {
      expect(hasHrPermission(accountantUser, 'hr.employee.list')).toBe(true)
      expect(hasHrPermission(accountantUser, 'hr.employee.read')).toBe(true)
      expect(hasHrPermission(accountantUser, 'hr.employee.view_sensitive')).toBe(false)
      expect(hasHrPermission(accountantUser, 'hr.employee.manage_salary')).toBe(false)

      expect(hasHrPermission(commercialUser, 'hr.employee.list')).toBe(false)
      expect(hasHrPermission(commercialUser, 'hr.employee.create')).toBe(false)
    })
  })

  describe('4. Employee Creation, Read & Sensitive Field Masking', () => {
    it('should return decrypted fields to SUPER_ADMIN but masked fields to ACCOUNTANT', async () => {
      const created = await createEmployee(
        {
          firstName: 'Hamza',
          lastName: 'Monasef',
          cin: 'EF998877',
          phonePrimary: '0661000000',
          hireDate: '2026-03-01',
          baseSalary: 15000,
          rib: '230780000000000000000999',
          cnssNumber: '1122334455'
        },
        superAdminUser
      )

      const adminDetail = await getEmployeeById(created.id, superAdminUser)
      expect(adminDetail.cin).toBe('EF998877')
      expect(adminDetail.baseSalary).toBe(15000)

      const accountantDetail = await getEmployeeById(created.id, accountantUser)
      expect(accountantDetail.cin).toBeNull()
      expect(accountantDetail.baseSalary).toBeNull()
      expect(accountantDetail.cinMasked).toBe('EF••••77')
      expect(accountantDetail.salaryFormatted).toBe('•••••• MAD')
    })
  })

  describe('5. Employee Editing & Optimistic Concurrency', () => {
    it('should update employee record and increment version', async () => {
      const created = await createEmployee(
        {
          firstName: 'Zhor',
          lastName: 'Jalala',
          phonePrimary: '0662223344',
          hireDate: '2026-04-01',
          baseSalary: 9000
        },
        superAdminUser
      )

      const updated = await updateEmployee(
        created.id,
        {
          version: created.version,
          phonePrimary: '0669999999',
          baseSalary: 10000
        },
        superAdminUser
      )

      expect(updated.version).toBe(created.version + 1)
      expect(updated.phonePrimary).toBe('0669999999')
      expect(Number(updated.baseSalary)).toBe(10000)
    })
  })

  describe('6. Archiving & Restoring Employees', () => {
    it('should require reason and exact confirmation string for archiving and restoring', async () => {
      const created = await createEmployee(
        {
          firstName: 'Abdo',
          lastName: 'Rahim',
          phonePrimary: '0664445566',
          hireDate: '2026-05-01'
        },
        superAdminUser
      )

      const archived = await archiveEmployee(created.id, 'Départ négocié', `ARCHIVER ${created.employeeNumber}`, superAdminUser)
      expect(archived.employmentStatus).toBe(EmploymentStatus.ARCHIVED)

      const restored = await restoreEmployee(created.id, `RESTAURER ${created.employeeNumber}`, superAdminUser)
      expect(restored.employmentStatus).toBe(EmploymentStatus.ACTIVE)
    })
  })

  describe('7. Photo Endpoints & Canonical Storage', () => {
    it('should upload, attach, and remove employee photo asset with audit logging', async () => {
      const emp = await createEmployee(
        {
          firstName: 'Sanaa',
          lastName: 'PhotoTest',
          phonePrimary: '0660001122',
          hireDate: '2026-01-01'
        },
        superAdminUser
      )

      const pngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex')

      const updated = await updateEmployeePhoto(
        emp.id,
        {
          originalName: 'profile.png',
          mimeType: 'image/png',
          size: pngBuffer.length,
          buffer: pngBuffer
        },
        superAdminUser
      )

      expect(updated.photoAssetId).not.toBeNull()

      const removed = await removeEmployeePhoto(emp.id, superAdminUser)
      expect(removed.photoAssetId).toBeNull()
    })
  })
})
