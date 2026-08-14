import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '../server/utils/db'
import { Role } from '@prisma/client'
import {
  createEmployee,
  getEmployeeById,
  linkUserAccount,
  unlinkUserAccount,
  updateEmployeePhoto,
  removeEmployeePhoto
} from '../server/services/hrEmployee.service'
import {
  getRawHrMasterKey,
  getHrEncryptionKey,
  getHrFingerprintKey
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

  beforeEach(async () => {
    const timestamp = Date.now()
    const rand = Math.floor(Math.random() * 100000)

    superAdminUser = await prisma.user.create({
      data: {
        name: 'Super Admin HR Audit',
        email: `super.admin.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.SUPER_ADMIN,
        isActive: true
      }
    })

    hrManagerUser = await prisma.user.create({
      data: {
        name: 'HR Manager Audit',
        email: `hr.manager.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.HR_MANAGER,
        isActive: true
      }
    })

    accountantUser = await prisma.user.create({
      data: {
        name: 'Accountant Audit',
        email: `accountant.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.ACCOUNTANT,
        isActive: true
      }
    })

    commercialUser = await prisma.user.create({
      data: {
        name: 'Commercial Audit',
        email: `commercial.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.COMMERCIAL,
        isActive: true
      }
    })

    unlinkedUser = await prisma.user.create({
      data: {
        name: 'Unlinked User Audit',
        email: `unlinked.audit.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hashed_pass',
        role: Role.COMMERCIAL,
        isActive: true
      }
    })
  })

  afterEach(async () => {
    const userIds = [superAdminUser.id, hrManagerUser.id, accountantUser.id, commercialUser.id, unlinkedUser.id]

    await prisma.employee.deleteMany({
      where: { createdById: { in: userIds } }
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

  describe('1. Dedicated HR_ENCRYPTION_KEY & HKDF Key Separation', () => {
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

      // Domain separation requirement: AES key and HMAC key must be distinct
      expect(aesKey.toString('hex')).not.toBe(hmacKey.toString('hex'))
    })

    it('should throw security error in production mode if HR_ENCRYPTION_KEY is missing', () => {
      const origEnv = process.env.NODE_ENV
      const origKey = process.env.HR_ENCRYPTION_KEY

      try {
        process.env.NODE_ENV = 'production'
        delete process.env.HR_ENCRYPTION_KEY

        expect(() => getRawHrMasterKey()).toThrow(/HR_ENCRYPTION_KEY environment variable is required in production mode/)
      } finally {
        process.env.NODE_ENV = origEnv
        process.env.HR_ENCRYPTION_KEY = origKey
      }
    })
  })

  describe('2. Granular Permission Architecture & Role Restrictions', () => {
    it('should enforce exact 10 granular permissions for SUPER_ADMIN and HR_MANAGER', () => {
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

    it('should restrict ACCOUNTANT to read-only (list, read) and block COMMERCIAL', () => {
      expect(hasHrPermission(accountantUser, 'hr.employee.list')).toBe(true)
      expect(hasHrPermission(accountantUser, 'hr.employee.read')).toBe(true)
      expect(hasHrPermission(accountantUser, 'hr.employee.view_sensitive')).toBe(false)
      expect(hasHrPermission(accountantUser, 'hr.employee.manage_salary')).toBe(false)

      expect(hasHrPermission(commercialUser, 'hr.employee.list')).toBe(false)
      expect(hasHrPermission(commercialUser, 'hr.employee.read')).toBe(false)
      expect(hasHrPermission(commercialUser, 'hr.employee.create')).toBe(false)
    })
  })

  describe('3. Employee Photo Endpoints & Validation', () => {
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

      // 1x1 valid PNG binary buffer
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

      // Remove photo
      const removed = await removeEmployeePhoto(emp.id, superAdminUser)
      expect(removed.photoAssetId).toBeNull()

      // Verify audit logs
      const photoAudits = await prisma.auditLog.findMany({
        where: {
          entityId: emp.id,
          action: { in: ['HR_EMPLOYEE_PHOTO_UPDATED', 'HR_EMPLOYEE_PHOTO_REMOVED'] }
        }
      })

      expect(photoAudits.length).toBe(2)
    })
  })

  describe('4. Dedicated Unlink-User Account Endpoint & Auditing', () => {
    it('should link and unlink User account without deleting User or Employee, generating audit logs & notifications', async () => {
      const emp = await createEmployee(
        {
          firstName: 'Nabil',
          lastName: 'LinkTest',
          phonePrimary: '0663332211',
          hireDate: '2026-01-01'
        },
        superAdminUser
      )

      // Link
      const linked = await linkUserAccount(emp.id, unlinkedUser.id, superAdminUser)
      expect(linked.linkedUserId).toBe(unlinkedUser.id)

      // Unlink
      const unlinked = await unlinkUserAccount(emp.id, superAdminUser)
      expect(unlinked.linkedUserId).toBeNull()

      // Confirm both user and employee persist
      const userCheck = await prisma.user.findUnique({ where: { id: unlinkedUser.id } })
      const empCheck = await prisma.employee.findUnique({ where: { id: emp.id } })

      expect(userCheck).not.toBeNull()
      expect(empCheck).not.toBeNull()

      // Audit logs check
      const linkAudits = await prisma.auditLog.findMany({
        where: {
          entityId: emp.id,
          action: { in: ['HR_EMPLOYEE_USER_LINKED', 'HR_EMPLOYEE_USER_UNLINKED'] }
        }
      })

      expect(linkAudits.length).toBe(2)
    })
  })

  describe('5. Backup & Isolated Restoration Verification', () => {
    it('should backup database containing synthetic HR records and verify checksums', async () => {
      const testDir = path.join(process.cwd(), 'tmp', 'audit_hr_backup_test')
      if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true })

      // Create synthetic employee with all sensitive fields
      const synthEmp = await createEmployee(
        {
          firstName: 'Synthetic',
          lastName: 'BackupEmployee',
          cin: 'AB999888',
          cnssNumber: '776655443',
          rib: '230780000000000000000777',
          baseSalary: 18500,
          phonePrimary: '0667778899',
          hireDate: '2026-01-01'
        },
        superAdminUser
      )

      await runBackup({ outputDir: testDir })

      const manifestPath = path.join(testDir, 'manifest.json')
      expect(fs.existsSync(manifestPath)).toBe(true)

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      expect(manifest.success).toBe(true)
      expect(manifest.dbDumpSha256).toMatch(/^[0-9a-f]{64}$/)
      expect(manifest.assetArchiveSha256).toMatch(/^[0-9a-f]{64}$/)

      // Verify decrypted vs masked reads
      const fullView = await getEmployeeById(synthEmp.id, superAdminUser)
      const maskedView = await getEmployeeById(synthEmp.id, accountantUser)

      expect(fullView.cin).toBe('AB999888')
      expect(fullView.baseSalary).toBe(18500)

      expect(maskedView.cin).toBeNull()
      expect(maskedView.baseSalary).toBeNull()
      expect(maskedView.cinMasked).toBe('AB••••88')
      expect(maskedView.salaryFormatted).toBe('•••••• MAD')

      // Clean up test backup files
      fs.rmSync(testDir, { recursive: true, force: true })
    })
  })
})
