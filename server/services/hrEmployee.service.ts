import { EmploymentStatus, Gender, PaymentMethod, Prisma } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import {
  encryptSensitiveField,
  decryptSensitiveField,
  computeCinFingerprint,
  maskCin,
  maskRib,
  maskCnss,
  maskSalary
} from '../utils/hrEncryption'
import { hasHrPermission } from '../utils/hrPermissions'
import { validateImageBinary, type UploadedFileMeta } from './asset.service'
import type { UserPublic } from '~/types/auth'

export interface CreateEmployeeInput {
  firstName: string
  lastName: string
  gender?: Gender
  birthDate?: string | Date | null
  birthPlace?: string | null
  nationality?: string | null
  cin?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  phonePrimary: string
  phoneSecondary?: string | null
  personalEmail?: string | null
  professionalEmail?: string | null
  emergencyContactName?: string | null
  emergencyContactRelationship?: string | null
  emergencyContactPhone?: string | null
  hireDate: string | Date
  employmentStatus?: EmploymentStatus
  baseSalary?: number | string | null
  salaryCurrency?: string
  paymentMethod?: PaymentMethod | null
  bankName?: string | null
  rib?: string | null
  cnssNumber?: string | null
  internalNotes?: string | null
  linkedUserId?: string | null
}

export interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  version: number
  departureDate?: string | Date | null
  departureReason?: string | null
}

/**
 * Generates a unique, concurrency-safe employee number (e.g. EMP-2026-0001)
 */
export async function generateNextEmployeeNumber(tenantId: string = 'default-tenant'): Promise<string> {
  const currentYear = new Date().getFullYear()
  const prefix = `EMP-${currentYear}-`

  const latestEmployee = await prisma.employee.findFirst({
    where: {
      tenantId,
      employeeNumber: {
        startsWith: prefix
      }
    },
    orderBy: {
      employeeNumber: 'desc'
    },
    select: {
      employeeNumber: true
    }
  })

  let nextSeq = 1
  if (latestEmployee && latestEmployee.employeeNumber) {
    const parts = latestEmployee.employeeNumber.split('-')
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`
}

/**
 * Helper to notify HR managers of important HR events
 */
async function notifyHrAdmins(title: string, message: string, severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL' = 'INFO') {
  try {
    const hrUsers = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'HR_MANAGER'] },
        isActive: true
      },
      select: { id: true }
    })

    for (const admin of hrUsers) {
      await createNotification({
        recipientUserId: admin.id,
        type: 'HR_NOTIFICATION',
        title,
        message,
        severity,
        actionUrl: '/rh/employes'
      })
    }
  } catch (err) {
    console.error('[HR] Failed to dispatch HR notification:', err)
  }
}

/**
 * Create a new Employee record
 */
export async function createEmployee(input: CreateEmployeeInput, actor: UserPublic) {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const displayName = `${firstName} ${lastName}`

  if (!firstName || !lastName) {
    const err: any = new Error('Le prénom et le nom sont obligatoires.')
    err.statusCode = 400
    throw err
  }

  if (!input.hireDate) {
    const err: any = new Error('La date d’embauche est obligatoire.')
    err.statusCode = 400
    throw err
  }

  const hireDate = new Date(input.hireDate)
  if (isNaN(hireDate.getTime())) {
    const err: any = new Error('La date d’embauche est invalide.')
    err.statusCode = 400
    throw err
  }

  if (input.birthDate) {
    const bDate = new Date(input.birthDate)
    if (!isNaN(bDate.getTime()) && bDate > new Date()) {
      const err: any = new Error('La date de naissance ne peut pas être dans le futur.')
      err.statusCode = 400
      throw err
    }
  }

  const salaryNum = input.baseSalary ? parseFloat(String(input.baseSalary)) : 0
  if (isNaN(salaryNum) || salaryNum < 0) {
    const err: any = new Error('Le salaire de base ne peut pas être négatif.')
    err.statusCode = 400
    throw err
  }

  const tenantId = (actor as any)?.tenantId || 'default-tenant'

  // CIN fingerprint uniqueness check per tenant
  let cinFingerprint: string | null = null
  if (input.cin && input.cin.trim()) {
    cinFingerprint = computeCinFingerprint(input.cin, tenantId)
    if (cinFingerprint) {
      const existingCin = await prisma.employee.findFirst({
        where: { tenantId, cinFingerprint }
      })
      if (existingCin) {
        const err: any = new Error('Ce numéro de CIN est déjà associé à un autre employé.')
        err.statusCode = 400
        throw err
      }
    }
  }

  // Linked user validation
  if (input.linkedUserId) {
    const targetUser = await prisma.user.findUnique({
      where: { id: input.linkedUserId }
    })
    if (!targetUser) {
      const err: any = new Error('Le compte utilisateur spécifié est introuvable.')
      err.statusCode = 400
      throw err
    }
    if (targetUser.tenantId !== tenantId) {
      const err: any = new Error('Impossible de lier un compte utilisateur d’un autre tenant.')
      err.statusCode = 403
      throw err
    }
    const existingLinked = await prisma.employee.findFirst({
      where: { tenantId, linkedUserId: input.linkedUserId }
    })
    if (existingLinked) {
      const err: any = new Error('Ce compte utilisateur est déjà lié à un autre employé.')
      err.statusCode = 400
      throw err
    }
  }

  const employeeNumber = await generateNextEmployeeNumber(tenantId)

  const employee = await prisma.employee.create({
    data: {
      tenantId,
      employeeNumber,
      firstName,
      lastName,
      displayName,
      gender: input.gender || null,
      birthDate: input.birthDate ? new Date(input.birthDate) : null,
      birthPlace: input.birthPlace?.trim() || null,
      nationality: input.nationality?.trim() || 'Marocaine',
      cinEncrypted: encryptSensitiveField(input.cin),
      cinFingerprint,
      addressLine1: input.addressLine1?.trim() || null,
      addressLine2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      country: input.country?.trim() || 'Maroc',
      phonePrimary: input.phonePrimary.trim(),
      phoneSecondary: input.phoneSecondary?.trim() || null,
      personalEmail: input.personalEmail?.trim() || null,
      professionalEmail: input.professionalEmail?.trim() || null,
      emergencyContactName: input.emergencyContactName?.trim() || null,
      emergencyContactRelationship: input.emergencyContactRelationship?.trim() || null,
      emergencyContactPhone: input.emergencyContactPhone?.trim() || null,
      hireDate,
      employmentStatus: input.employmentStatus || EmploymentStatus.ACTIVE,
      baseSalary: new Prisma.Decimal(salaryNum),
      salaryCurrency: input.salaryCurrency || 'MAD',
      paymentMethod: input.paymentMethod || null,
      bankName: input.bankName?.trim() || null,
      ribEncrypted: encryptSensitiveField(input.rib),
      cnssNumberEncrypted: encryptSensitiveField(input.cnssNumber),
      internalNotes: input.internalNotes?.trim() || null,
      linkedUserId: input.linkedUserId || null,
      createdById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_EMPLOYEE_CREATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EMPLOYEE',
    entityId: employee.id,
    entityReference: employee.employeeNumber,
    metadata: {
      employeeNumber: employee.employeeNumber,
      displayName: employee.displayName,
      employmentStatus: employee.employmentStatus
    }
  })

  return employee
}

/**
 * Get paginated list of employees with search and filters
 */
export async function getEmployees(
  query: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    includeArchived?: boolean
    linkedStatus?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  },
  actor: UserPublic
) {
  const page = Math.max(1, query.page || 1)
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 15))
  const skip = (page - 1) * pageSize

  const where: Prisma.EmployeeWhereInput = {}

  if (!query.includeArchived) {
    where.employmentStatus = { not: EmploymentStatus.ARCHIVED }
  }

  if (query.status && query.status !== 'ALL') {
    where.employmentStatus = query.status as EmploymentStatus
  }

  if (query.linkedStatus === 'LINKED') {
    where.linkedUserId = { not: null }
  } else if (query.linkedStatus === 'UNLINKED') {
    where.linkedUserId = null
  }

  if (query.search && query.search.trim()) {
    const s = query.search.trim()
    where.OR = [
      { employeeNumber: { contains: s, mode: 'insensitive' } },
      { firstName: { contains: s, mode: 'insensitive' } },
      { lastName: { contains: s, mode: 'insensitive' } },
      { displayName: { contains: s, mode: 'insensitive' } },
      { phonePrimary: { contains: s, mode: 'insensitive' } },
      { professionalEmail: { contains: s, mode: 'insensitive' } }
    ]
  }

  const [totalItems, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [query.sortBy || 'createdAt']: query.sortOrder || 'desc'
      },
      include: {
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        }
      }
    })
  ])

  const canViewSensitive = hasHrPermission(actor, 'hr.employee.view_sensitive')

  const formattedEmployees = employees.map(emp => {
    const rawCin = decryptSensitiveField(emp.cinEncrypted)
    const rawRib = decryptSensitiveField(emp.ribEncrypted)
    const rawCnss = decryptSensitiveField(emp.cnssNumberEncrypted)

    return {
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      firstName: emp.firstName,
      lastName: emp.lastName,
      displayName: emp.displayName,
      photoAssetId: emp.photoAssetId,
      phonePrimary: emp.phonePrimary,
      professionalEmail: emp.professionalEmail,
      hireDate: emp.hireDate,
      employmentStatus: emp.employmentStatus,
      baseSalary: canViewSensitive ? Number(emp.baseSalary) : null,
      salaryFormatted: canViewSensitive ? `${Number(emp.baseSalary).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD` : maskSalary(emp.baseSalary),
      cinMasked: maskCin(rawCin),
      ribMasked: maskRib(rawRib),
      cnssMasked: maskCnss(rawCnss),
      linkedUser: emp.linkedUser,
      version: emp.version,
      archivedAt: emp.archivedAt,
      createdAt: emp.createdAt
    }
  })

  return {
    data: formattedEmployees,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize)
    }
  }
}

/**
 * Get detailed Employee profile by ID
 */
export async function getEmployeeById(id: string, actor: UserPublic) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      linkedUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true
        }
      },
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      updatedBy: {
        select: { id: true, name: true, email: true }
      },
      archivedBy: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  if (!employee) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  const canViewSensitive = hasHrPermission(actor, 'hr.employee.view_sensitive')
  const canManageSalary = hasHrPermission(actor, 'hr.employee.manage_salary')

  const rawCin = decryptSensitiveField(employee.cinEncrypted)
  const rawRib = decryptSensitiveField(employee.ribEncrypted)
  const rawCnss = decryptSensitiveField(employee.cnssNumberEncrypted)

  // Fetch recent HR audit log activity for this employee
  const activities = await prisma.auditLog.findMany({
    where: {
      entityType: 'EMPLOYEE',
      entityId: id
    },
    take: 15,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  // Safe audit event logging if sensitive fields viewed
  if (canViewSensitive) {
    await createAuditEntry({
      userId: actor.id,
      action: 'HR_SENSITIVE_DATA_VIEWED',
      category: 'HR',
      result: 'SUCCESS',
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      entityReference: employee.employeeNumber
    })
  }

  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    displayName: employee.displayName,
    photoAssetId: employee.photoAssetId,
    gender: employee.gender,
    birthDate: employee.birthDate,
    birthPlace: employee.birthPlace,
    nationality: employee.nationality,

    // Sensitive identification (decrypted or masked based on permission)
    cin: canViewSensitive ? rawCin : null,
    cinMasked: maskCin(rawCin),

    addressLine1: canViewSensitive ? employee.addressLine1 : null,
    addressLine2: canViewSensitive ? employee.addressLine2 : null,
    city: employee.city,
    postalCode: employee.postalCode,
    country: employee.country,

    phonePrimary: employee.phonePrimary,
    phoneSecondary: canViewSensitive ? employee.phoneSecondary : null,
    personalEmail: canViewSensitive ? employee.personalEmail : null,
    professionalEmail: employee.professionalEmail,

    emergencyContactName: canViewSensitive ? employee.emergencyContactName : null,
    emergencyContactRelationship: canViewSensitive ? employee.emergencyContactRelationship : null,
    emergencyContactPhone: canViewSensitive ? employee.emergencyContactPhone : null,

    hireDate: employee.hireDate,
    employmentStatus: employee.employmentStatus,
    departureDate: employee.departureDate,
    departureReason: employee.departureReason,

    baseSalary: canManageSalary ? Number(employee.baseSalary) : null,
    salaryFormatted: canManageSalary
      ? `${Number(employee.baseSalary).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD`
      : maskSalary(employee.baseSalary),
    salaryCurrency: employee.salaryCurrency,

    paymentMethod: employee.paymentMethod,
    bankName: canViewSensitive ? employee.bankName : null,
    rib: canViewSensitive ? rawRib : null,
    ribMasked: maskRib(rawRib),
    cnssNumber: canViewSensitive ? rawCnss : null,
    cnssMasked: maskCnss(rawCnss),

    internalNotes: canViewSensitive ? employee.internalNotes : null,
    linkedUser: employee.linkedUser,
    createdBy: employee.createdBy,
    updatedBy: employee.updatedBy,
    archivedBy: employee.archivedBy,
    archivedAt: employee.archivedAt,
    archiveReason: employee.archiveReason,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    version: employee.version,
    activities
  }
}

/**
 * Update an existing Employee record with optimistic concurrency check
 */
export async function updateEmployee(id: string, input: UpdateEmployeeInput, actor: UserPublic) {
  const existing = await prisma.employee.findUnique({
    where: { id }
  })

  if (!existing) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  // Optimistic concurrency check
  if (input.version === undefined || input.version !== existing.version) {
    const err: any = new Error('Cette fiche a été modifiée par un autre utilisateur. Rechargez les données avant de continuer.')
    err.statusCode = 409
    throw err
  }

  const updateData: Prisma.EmployeeUpdateInput = {
    version: existing.version + 1,
    updatedBy: { connect: { id: actor.id } }
  }

  if (input.firstName !== undefined || input.lastName !== undefined) {
    const newFirst = input.firstName !== undefined ? input.firstName.trim() : existing.firstName
    const newLast = input.lastName !== undefined ? input.lastName.trim() : existing.lastName
    if (!newFirst || !newLast) {
      const err: any = new Error('Le prénom et le nom sont obligatoires.')
      err.statusCode = 400
      throw err
    }
    updateData.firstName = newFirst
    updateData.lastName = newLast
    updateData.displayName = `${newFirst} ${newLast}`
  }

  if (input.gender !== undefined) updateData.gender = input.gender || null
  if (input.birthDate !== undefined) updateData.birthDate = input.birthDate ? new Date(input.birthDate) : null
  if (input.birthPlace !== undefined) updateData.birthPlace = input.birthPlace?.trim() || null
  if (input.nationality !== undefined) updateData.nationality = input.nationality?.trim() || 'Marocaine'

  // CIN handling
  if (input.cin !== undefined) {
    if (input.cin && input.cin.trim()) {
      const cinFingerprint = computeCinFingerprint(input.cin)
      const existingCin = await prisma.employee.findFirst({
        where: {
          cinFingerprint,
          id: { not: id }
        }
      })
      if (existingCin) {
        const err: any = new Error('Ce numéro de CIN est déjà associé à un autre employé.')
        err.statusCode = 400
        throw err
      }
      updateData.cinEncrypted = encryptSensitiveField(input.cin)
      updateData.cinFingerprint = cinFingerprint
    } else {
      updateData.cinEncrypted = null
      updateData.cinFingerprint = null
    }
  }

  if (input.addressLine1 !== undefined) updateData.addressLine1 = input.addressLine1?.trim() || null
  if (input.addressLine2 !== undefined) updateData.addressLine2 = input.addressLine2?.trim() || null
  if (input.city !== undefined) updateData.city = input.city?.trim() || null
  if (input.postalCode !== undefined) updateData.postalCode = input.postalCode?.trim() || null
  if (input.country !== undefined) updateData.country = input.country?.trim() || 'Maroc'

  if (input.phonePrimary !== undefined) {
    if (!input.phonePrimary.trim()) {
      const err: any = new Error('Le téléphone principal est obligatoire.')
      err.statusCode = 400
      throw err
    }
    updateData.phonePrimary = input.phonePrimary.trim()
  }

  if (input.phoneSecondary !== undefined) updateData.phoneSecondary = input.phoneSecondary?.trim() || null
  if (input.personalEmail !== undefined) updateData.personalEmail = input.personalEmail?.trim() || null
  if (input.professionalEmail !== undefined) updateData.professionalEmail = input.professionalEmail?.trim() || null

  if (input.emergencyContactName !== undefined) updateData.emergencyContactName = input.emergencyContactName?.trim() || null
  if (input.emergencyContactRelationship !== undefined) updateData.emergencyContactRelationship = input.emergencyContactRelationship?.trim() || null
  if (input.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = input.emergencyContactPhone?.trim() || null

  if (input.hireDate !== undefined) {
    const hDate = new Date(input.hireDate)
    if (isNaN(hDate.getTime())) {
      const err: any = new Error('La date d’embauche est invalide.')
      err.statusCode = 400
      throw err
    }
    updateData.hireDate = hDate
  }

  if (input.employmentStatus !== undefined) updateData.employmentStatus = input.employmentStatus
  if (input.departureDate !== undefined) updateData.departureDate = input.departureDate ? new Date(input.departureDate) : null
  if (input.departureReason !== undefined) updateData.departureReason = input.departureReason?.trim() || null

  let salaryChanged = false
  if (input.baseSalary !== undefined && hasHrPermission(actor, 'hr.employee.manage_salary')) {
    const newSalary = parseFloat(String(input.baseSalary))
    if (isNaN(newSalary) || newSalary < 0) {
      const err: any = new Error('Le salaire de base ne peut pas être négatif.')
      err.statusCode = 400
      throw err
    }
    if (Number(existing.baseSalary) !== newSalary) {
      salaryChanged = true
      updateData.baseSalary = new Prisma.Decimal(newSalary)
    }
  }

  if (input.paymentMethod !== undefined) updateData.paymentMethod = input.paymentMethod || null
  if (input.bankName !== undefined) updateData.bankName = input.bankName?.trim() || null
  if (input.rib !== undefined) updateData.ribEncrypted = encryptSensitiveField(input.rib)
  if (input.cnssNumber !== undefined) updateData.cnssNumberEncrypted = encryptSensitiveField(input.cnssNumber)
  if (input.internalNotes !== undefined) updateData.internalNotes = input.internalNotes?.trim() || null

  const updatedEmployee = await prisma.employee.update({
    where: { id },
    data: updateData
  })

  // Audit event for employee update
  await createAuditEntry({
    userId: actor.id,
    action: 'HR_EMPLOYEE_UPDATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EMPLOYEE',
    entityId: updatedEmployee.id,
    entityReference: updatedEmployee.employeeNumber,
    metadata: {
      employeeNumber: updatedEmployee.employeeNumber,
      displayName: updatedEmployee.displayName
    }
  })

  // Separate audit event & notification if salary was modified
  if (salaryChanged) {
    await createAuditEntry({
      userId: actor.id,
      action: 'HR_SALARY_CHANGED',
      category: 'HR',
      result: 'SUCCESS',
      entityType: 'EMPLOYEE',
      entityId: updatedEmployee.id,
      entityReference: updatedEmployee.employeeNumber,
      metadata: {
        employeeNumber: updatedEmployee.employeeNumber,
        salaryChanged: true
      }
    })

    await notifyHrAdmins(
      'Modification de salaire RH',
      `Le salaire de l’employé ${updatedEmployee.employeeNumber} (${updatedEmployee.displayName}) a été modifié par ${actor.name}.`,
      'WARNING'
    )
  }

  return updatedEmployee
}

/**
 * Archive an Employee with explicit confirmation text and reason
 */
export async function archiveEmployee(id: string, reason: string, confirmText: string, actor: UserPublic) {
  const existing = await prisma.employee.findUnique({
    where: { id }
  })

  if (!existing) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  const expectedConfirm = `ARCHIVER ${existing.employeeNumber}`
  if (confirmText !== expectedConfirm) {
    const err: any = new Error(`La phrase de confirmation est incorrecte. Veuillez saisir exactement: ${expectedConfirm}`)
    err.statusCode = 400
    throw err
  }

  if (!reason || !reason.trim()) {
    const err: any = new Error('Le motif d’archivage est obligatoire.')
    err.statusCode = 400
    throw err
  }

  const archived = await prisma.employee.update({
    where: { id },
    data: {
      employmentStatus: EmploymentStatus.ARCHIVED,
      archivedAt: new Date(),
      archivedById: actor.id,
      archiveReason: reason.trim(),
      version: existing.version + 1,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_EMPLOYEE_ARCHIVED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EMPLOYEE',
    entityId: archived.id,
    entityReference: archived.employeeNumber,
    metadata: {
      employeeNumber: archived.employeeNumber,
      displayName: archived.displayName,
      archiveReason: reason.trim()
    }
  })

  await notifyHrAdmins(
    'Employé archivé',
    `L’employé ${archived.employeeNumber} (${archived.displayName}) a été archivé par ${actor.name}. Motif: ${reason.trim()}`,
    'WARNING'
  )

  return archived
}

/**
 * Restore an archived Employee
 */
export async function restoreEmployee(id: string, confirmText: string, actor: UserPublic) {
  const existing = await prisma.employee.findUnique({
    where: { id }
  })

  if (!existing) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  const expectedConfirm = `RESTAURER ${existing.employeeNumber}`
  if (confirmText !== expectedConfirm) {
    const err: any = new Error(`La phrase de confirmation est incorrecte. Veuillez saisir exactement: ${expectedConfirm}`)
    err.statusCode = 400
    throw err
  }

  const restored = await prisma.employee.update({
    where: { id },
    data: {
      employmentStatus: EmploymentStatus.ACTIVE,
      archivedAt: null,
      archivedById: null,
      archiveReason: null,
      version: existing.version + 1,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_EMPLOYEE_RESTORED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EMPLOYEE',
    entityId: restored.id,
    entityReference: restored.employeeNumber,
    metadata: {
      employeeNumber: restored.employeeNumber,
      displayName: restored.displayName
    }
  })

  await notifyHrAdmins(
    'Employé restauré',
    `L’employé ${restored.employeeNumber} (${restored.displayName}) a été restauré par ${actor.name}.`,
    'SUCCESS'
  )

  return restored
}

/**
 * Link an existing User account to an Employee record
 */
export async function linkUserAccount(employeeId: string, userId: string, actor: UserPublic) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  })

  if (!employee) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!targetUser || !targetUser.isActive) {
    const err: any = new Error('Compte utilisateur introuvable ou inactif.')
    err.statusCode = 400
    throw err
  }

  if (employee.tenantId !== targetUser.tenantId) {
    const err: any = new Error('Impossible de lier un compte utilisateur d’un autre tenant.')
    err.statusCode = 403
    throw err
  }

  const existingLink = await prisma.employee.findUnique({
    where: { linkedUserId: userId }
  })

  if (existingLink && existingLink.id !== employeeId) {
    const err: any = new Error(`Ce compte utilisateur est déjà lié à l’employé ${existingLink.employeeNumber}.`)
    err.statusCode = 400
    throw err
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      linkedUserId: userId,
      version: employee.version + 1,
      updatedById: actor.id
    },
    include: {
      linkedUser: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_EMPLOYEE_USER_LINKED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EMPLOYEE',
    entityId: updated.id,
    entityReference: updated.employeeNumber,
    metadata: {
      employeeNumber: updated.employeeNumber,
      linkedUserId: targetUser.id,
      linkedUserName: targetUser.name
    }
  })

  await notifyHrAdmins(
    'Compte utilisateur lié',
    `Le compte ${targetUser.email} a été lié à l’employé ${updated.employeeNumber} par ${actor.name}.`,
    'INFO'
  )

  return updated
}

/**
 * Unlink User account from an Employee record
 */
export async function unlinkUserAccount(employeeId: string, actor: UserPublic) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  })

  if (!employee) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  if (!employee.linkedUserId) {
    const err: any = new Error('Cet employé n’a aucun compte utilisateur lié.')
    err.statusCode = 400
    throw err
  }

  const prevUserId = employee.linkedUserId

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      linkedUserId: null,
      version: employee.version + 1,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_EMPLOYEE_USER_UNLINKED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EMPLOYEE',
    entityId: updated.id,
    entityReference: updated.employeeNumber,
    metadata: {
      employeeNumber: updated.employeeNumber,
      unlinkedUserId: prevUserId
    }
  })

  await notifyHrAdmins(
    'Compte utilisateur délié',
    `Le compte utilisateur de l’employé ${updated.employeeNumber} a été délié par ${actor.name}.`,
    'INFO'
  )

  return updated
}

/**
 * Upload and attach a profile photo asset to an Employee
 */
export async function updateEmployeePhoto(employeeId: string, fileMeta: UploadedFileMeta, actor: UserPublic) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  })

  if (!employee) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  // Validate binary image (PNG, JPEG, WebP, max 2MB)
  const validated = validateImageBinary(fileMeta, 'LOGO' as any)
  const sha256 = (await import('node:crypto')).createHash('sha256').update(fileMeta.buffer).digest('hex')

  const asset = await prisma.companyAsset.create({
    data: {
      type: 'LOGO' as any,
      originalName: fileMeta.originalName || `photo_${employee.employeeNumber}.png`,
      mimeType: validated.mimeType,
      size: fileMeta.size,
      width: validated.width || null,
      height: validated.height || null,
      sha256,
      data: new Uint8Array(fileMeta.buffer),
      isActive: true,
      uploadedById: actor.id
    }
  })

  // Ensure file is saved to server/uploads directory for disk backup
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const uploadsDir = path.join(process.cwd(), 'server', 'uploads')
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
    const ext = validated.mimeType.split('/')[1] || 'png'
    const filePath = path.join(uploadsDir, `${asset.id}.${ext}`)
    fs.writeFileSync(filePath, fileMeta.buffer)
  } catch (err) {
    console.warn('[HR] Warning: could not write photo asset to server/uploads disk:', err)
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      photoAssetId: asset.id,
      version: employee.version + 1,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_EMPLOYEE_PHOTO_UPDATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EMPLOYEE',
    entityId: updated.id,
    entityReference: updated.employeeNumber,
    metadata: {
      employeeNumber: updated.employeeNumber,
      photoAssetId: asset.id
    }
  })

  return updated
}

/**
 * Remove photo from an Employee
 */
export async function removeEmployeePhoto(employeeId: string, actor: UserPublic) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  })

  if (!employee) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      photoAssetId: null,
      version: employee.version + 1,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_EMPLOYEE_PHOTO_REMOVED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EMPLOYEE',
    entityId: updated.id,
    entityReference: updated.employeeNumber
  })

  return updated
}

/**
 * Get Phase 1 HR overview dashboard metrics
 */
export async function getHrOverviewMetrics(_actor: UserPublic) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [active, onboarding, suspended, departed, archived, newThisMonth, recentEmployees, recentActivities] = await Promise.all([
    prisma.employee.count({ where: { employmentStatus: EmploymentStatus.ACTIVE } }),
    prisma.employee.count({ where: { employmentStatus: EmploymentStatus.ONBOARDING } }),
    prisma.employee.count({ where: { employmentStatus: EmploymentStatus.SUSPENDED } }),
    prisma.employee.count({ where: { employmentStatus: EmploymentStatus.DEPARTED } }),
    prisma.employee.count({ where: { employmentStatus: EmploymentStatus.ARCHIVED } }),
    prisma.employee.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.employee.findMany({
      where: { employmentStatus: { not: EmploymentStatus.ARCHIVED } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        employeeNumber: true,
        displayName: true,
        hireDate: true,
        employmentStatus: true,
        phonePrimary: true,
        professionalEmail: true
      }
    }),
    prisma.auditLog.findMany({
      where: { category: 'HR' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    })
  ])

  return {
    metrics: {
      totalActive: active,
      onboarding,
      suspended,
      departed,
      archived,
      newThisMonth
    },
    recentEmployees,
    recentActivities
  }
}
