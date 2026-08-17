import { describe, it, expect, beforeAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { createDocumentRecord, uploadDocumentVersion, getDocuments, getDocumentVersionBuffer } from '../server/services/hrDocument.service'
import { createEmployee } from '../server/services/hrEmployee.service'
import { DocumentCategory } from '@prisma/client'

describe('HR Secure Document Vault & Structural PDF Parsing Tests', () => {
  let superAdminUser: any
  let accountantUser: any
  let emp: any
  let docId: string

  beforeAll(async () => {
    const timestamp = Date.now()
    const rand = Math.floor(Math.random() * 100000)
    const testTenantId = `tenant-test-vault-${timestamp}-${rand}`

    superAdminUser = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        name: 'Super Admin Vault',
        email: `admin.vault.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hash',
        role: 'SUPER_ADMIN',
        isActive: true
      }
    })

    accountantUser = await prisma.user.create({
      data: {
        tenantId: testTenantId,
        name: 'Compta Vault',
        email: `compta.vault.${timestamp}.${rand}@atlasbites.ma`,
        passwordHash: 'hash',
        role: 'ACCOUNTANT',
        isActive: true
      }
    })

    emp = await createEmployee({ firstName: 'Salma', lastName: 'El Amrani', phonePrimary: '+212633333333', hireDate: '2026-01-01' }, superAdminUser)
  })

  it('should support all required document categories including WARNING, RESIGNATION and TERMINATION', async () => {
    const docWarning = await createDocumentRecord({
      employeeId: emp.id,
      category: DocumentCategory.WARNING,
      title: 'Avertissement disciplinaire du 15 mai'
    }, superAdminUser)

    expect(docWarning.category).toBe('WARNING')

    const docResignation = await createDocumentRecord({
      employeeId: emp.id,
      category: DocumentCategory.RESIGNATION,
      title: 'Lettre de démission remise en main propre'
    }, superAdminUser)

    expect(docResignation.category).toBe('RESIGNATION')

    const docTermination = await createDocumentRecord({
      employeeId: emp.id,
      category: DocumentCategory.TERMINATION,
      title: 'Reçu pour solde de tout compte et attestation'
    }, superAdminUser)

    expect(docTermination.category).toBe('TERMINATION')

    docId = docWarning.id
  })

  it('should reject incomplete PDF lacking %%EOF marker', async () => {
    const malformedPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n') // Missing %%EOF
    await expect(uploadDocumentVersion({
      documentId: docId,
      originalFileName: 'corrupted.pdf',
      mimeType: 'application/pdf',
      buffer: malformedPdf
    }, superAdminUser)).rejects.toThrow('Fichier PDF corrompu : marqueur de fin %%EOF manquant.')
  })

  it('should reject encrypted PDF containing /Encrypt dictionary', async () => {
    const encryptedPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Encrypt 2 0 R >>\nendobj\n%%EOF')
    await expect(uploadDocumentVersion({
      documentId: docId,
      originalFileName: 'encrypted.pdf',
      mimeType: 'application/pdf',
      buffer: encryptedPdf
    }, superAdminUser)).rejects.toThrow('Les fichiers PDF protégés par mot de passe ou cryptés ne sont pas autorisés.')
  })

  it('should reject PDF containing embedded JavaScript / Launch triggers', async () => {
    const jsPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /JavaScript 2 0 R >>\nendobj\n%%EOF')
    await expect(uploadDocumentVersion({
      documentId: docId,
      originalFileName: 'js_payload.pdf',
      mimeType: 'application/pdf',
      buffer: jsPdf
    }, superAdminUser)).rejects.toThrow('Le fichier PDF contient des scripts JavaScript ou exécutables non autorisés.')
  })

  it('should upload valid structural PDF and compute SHA-256 integrity hash', async () => {
    const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF')

    const version = await uploadDocumentVersion({
      documentId: docId,
      originalFileName: 'avertissement_salma.pdf',
      mimeType: 'application/pdf',
      buffer: validPdf
    }, superAdminUser)

    expect(version.versionNumber).toBe(1)
    expect(version.sha256).toBeDefined()
    expect(version.sha256.length).toBe(64)
  })

  it('should enforce medical document access restrictions for users lacking hr.document.read_medical', async () => {
    const medDoc = await createDocumentRecord({
      employeeId: emp.id,
      category: DocumentCategory.MEDICAL,
      title: 'Certificat médical d’aptitude physique'
    }, superAdminUser)

    // Accountant user listing documents should not receive medical category document
    const list = await getDocuments({ employeeId: emp.id }, accountantUser)
    const foundMed = list.data.find(d => d.id === medDoc.id)
    expect(foundMed).toBeUndefined()
  })
})
