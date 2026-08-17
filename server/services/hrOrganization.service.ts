import { Prisma, SiteType } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import type { UserPublic } from '~/types/auth'

export interface CreateSiteInput {
  code: string
  name: string
  type?: SiteType
  description?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  managerEmployeeId?: string
  openingDate?: string
  closingDate?: string
}

export interface UpdateSiteInput {
  version: number
  name?: string
  type?: SiteType
  description?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  postalCode?: string
  country?: string
  phone?: string
  email?: string
  managerEmployeeId?: string | null
  openingDate?: string | null
  closingDate?: string | null
  isActive?: boolean
}

export interface ArchiveInput {
  version: number
  archiveReason: string
  confirmCode: string
}

/**
 * Get sites list with search, active/archived filtering, and pagination
 */
export async function getSites(query: {
  search?: string
  type?: SiteType
  isActive?: boolean
  isArchived?: boolean
  page?: number
  limit?: number
}, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.WorkSiteWhereInput = {
    tenantId
  }

  if (query.isArchived !== undefined) {
    where.archivedAt = query.isArchived ? { not: null } : null
  } else {
    where.archivedAt = null
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive
  }

  if (query.type) {
    where.type = query.type
  }

  if (query.search?.trim()) {
    const q = query.search.trim()
    where.OR = [
      { code: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [total, sites] = await Promise.all([
    prisma.workSite.count({ where }),
    prisma.workSite.findMany({
      where,
      skip,
      take: limit,
      orderBy: { code: 'asc' },
      include: {
        managerEmployee: {
          select: { id: true, employeeNumber: true, displayName: true }
        },
        _count: {
          select: { assignments: true, contracts: true }
        }
      }
    })
  ])

  return {
    data: sites,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Create a new WorkSite
 */
export async function createSite(input: CreateSiteInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const code = input.code.trim().toUpperCase()
  const name = input.name.trim()

  if (!code || !name) {
    const err: any = new Error('Le code et le nom du site sont obligatoires.')
    err.statusCode = 400
    throw err
  }

  const existingCode = await prisma.workSite.findUnique({
    where: { tenantId_code: { tenantId, code } }
  })

  if (existingCode) {
    const err: any = new Error(`Le code site ${code} est déjà utilisé.`)
    err.statusCode = 400
    throw err
  }

  if (input.managerEmployeeId) {
    const mgr = await prisma.employee.findFirst({
      where: { id: input.managerEmployeeId, tenantId }
    })
    if (!mgr) {
      const err: any = new Error('Responsable de site introuvable.')
      err.statusCode = 400
      throw err
    }
  }

  const site = await prisma.workSite.create({
    data: {
      tenantId,
      code,
      name,
      type: input.type || SiteType.OTHER,
      description: input.description?.trim() || null,
      addressLine1: input.addressLine1?.trim() || null,
      addressLine2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      country: input.country?.trim() || 'Maroc',
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      managerEmployeeId: input.managerEmployeeId || null,
      openingDate: input.openingDate ? new Date(input.openingDate) : null,
      closingDate: input.closingDate ? new Date(input.closingDate) : null,
      createdById: actor.id
    },
    include: {
      managerEmployee: {
        select: { id: true, employeeNumber: true, displayName: true }
      }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SITE_CREATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'WorkSite',
    entityId: site.id,
    entityReference: site.code,
    metadata: { code: site.code, name: site.name, type: site.type }
  })

  return site
}

/**
 * Update WorkSite with optimistic concurrency
 */
export async function updateSite(id: string, input: UpdateSiteInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const site = await prisma.workSite.findFirst({
    where: { id, tenantId }
  })

  if (!site) {
    const err: any = new Error('Site introuvable.')
    err.statusCode = 404
    throw err
  }

  if (input.version === undefined || input.version !== site.version) {
    const err: any = new Error('Le site a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  if (input.managerEmployeeId) {
    const mgr = await prisma.employee.findFirst({
      where: { id: input.managerEmployeeId, tenantId }
    })
    if (!mgr) {
      const err: any = new Error('Responsable de site introuvable.')
      err.statusCode = 400
      throw err
    }
  }

  const updated = await prisma.workSite.update({
    where: { id },
    data: {
      name: input.name !== undefined ? input.name.trim() : site.name,
      type: input.type !== undefined ? input.type : site.type,
      description: input.description !== undefined ? (input.description?.trim() || null) : site.description,
      addressLine1: input.addressLine1 !== undefined ? (input.addressLine1?.trim() || null) : site.addressLine1,
      addressLine2: input.addressLine2 !== undefined ? (input.addressLine2?.trim() || null) : site.addressLine2,
      city: input.city !== undefined ? (input.city?.trim() || null) : site.city,
      postalCode: input.postalCode !== undefined ? (input.postalCode?.trim() || null) : site.postalCode,
      country: input.country !== undefined ? (input.country?.trim() || 'Maroc') : site.country,
      phone: input.phone !== undefined ? (input.phone?.trim() || null) : site.phone,
      email: input.email !== undefined ? (input.email?.trim() || null) : site.email,
      managerEmployeeId: input.managerEmployeeId !== undefined ? (input.managerEmployeeId || null) : site.managerEmployeeId,
      openingDate: input.openingDate !== undefined ? (input.openingDate ? new Date(input.openingDate) : null) : site.openingDate,
      closingDate: input.closingDate !== undefined ? (input.closingDate ? new Date(input.closingDate) : null) : site.closingDate,
      isActive: input.isActive !== undefined ? input.isActive : site.isActive,
      version: site.version + 1,
      updatedById: actor.id
    },
    include: {
      managerEmployee: {
        select: { id: true, employeeNumber: true, displayName: true }
      }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SITE_UPDATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'WorkSite',
    entityId: updated.id,
    entityReference: updated.code,
    metadata: { code: updated.code, version: updated.version }
  })

  return updated
}

/**
 * Soft Archive WorkSite with typed confirmation
 */
export async function archiveSite(id: string, input: ArchiveInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const site = await prisma.workSite.findFirst({
    where: { id, tenantId }
  })

  if (!site) {
    const err: any = new Error('Site introuvable.')
    err.statusCode = 404
    throw err
  }

  if (input.version === undefined || input.version !== site.version) {
    const err: any = new Error('Le site a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  const expectedConfirm = `ARCHIVER ${site.code}`
  if (input.confirmCode?.trim() !== expectedConfirm) {
    const err: any = new Error(`Code de confirmation incorrect. Saisissez exactement "${expectedConfirm}".`)
    err.statusCode = 400
    throw err
  }

  if (!input.archiveReason?.trim()) {
    const err: any = new Error('Le motif d’archivage est obligatoire.')
    err.statusCode = 400
    throw err
  }

  const archived = await prisma.workSite.update({
    where: { id },
    data: {
      isActive: false,
      archivedAt: new Date(),
      archivedById: actor.id,
      archiveReason: input.archiveReason.trim(),
      version: site.version + 1
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SITE_ARCHIVED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'WorkSite',
    entityId: archived.id,
    entityReference: archived.code,
    metadata: { code: archived.code, reason: archived.archiveReason }
  })

  await createNotification({
    recipientRole: 'SUPER_ADMIN',
    type: 'HR_ALERT',
    severity: 'WARNING',
    title: 'Site archivé',
    message: `Le site ${archived.name} (${archived.code}) a été archivé par ${actor.name}.`,
    actionUrl: '/rh/organisation'
  })

  return archived
}

/**
 * Restore WorkSite
 */
export async function restoreSite(id: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const site = await prisma.workSite.findFirst({
    where: { id, tenantId }
  })

  if (!site) {
    const err: any = new Error('Site introuvable.')
    err.statusCode = 404
    throw err
  }

  const restored = await prisma.workSite.update({
    where: { id },
    data: {
      isActive: true,
      archivedAt: null,
      archivedById: null,
      archiveReason: null,
      version: site.version + 1,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SITE_RESTORED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'WorkSite',
    entityId: restored.id,
    entityReference: restored.code,
    metadata: { code: restored.code }
  })

  return restored
}

// --- DEPARTMENT SERVICES ---

export interface CreateDepartmentInput {
  code: string
  name: string
  description?: string
  managerEmployeeId?: string
}

export interface UpdateDepartmentInput {
  version: number
  name?: string
  description?: string
  managerEmployeeId?: string | null
  isActive?: boolean
}

export async function getDepartments(query: {
  search?: string
  isActive?: boolean
  isArchived?: boolean
  page?: number
  limit?: number
}, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.DepartmentWhereInput = { tenantId }

  if (query.isArchived !== undefined) {
    where.archivedAt = query.isArchived ? { not: null } : null
  } else {
    where.archivedAt = null
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive
  }

  if (query.search?.trim()) {
    const q = query.search.trim()
    where.OR = [
      { code: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [total, departments] = await Promise.all([
    prisma.department.count({ where }),
    prisma.department.findMany({
      where,
      skip,
      take: limit,
      orderBy: { code: 'asc' },
      include: {
        managerEmployee: {
          select: { id: true, employeeNumber: true, displayName: true }
        },
        _count: {
          select: { positions: true, assignments: true, contracts: true }
        }
      }
    })
  ])

  return {
    data: departments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export async function createDepartment(input: CreateDepartmentInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const code = input.code.trim().toUpperCase()
  const name = input.name.trim()

  if (!code || !name) {
    const err: any = new Error('Le code et le nom du département sont obligatoires.')
    err.statusCode = 400
    throw err
  }

  const existingCode = await prisma.department.findUnique({
    where: { tenantId_code: { tenantId, code } }
  })

  if (existingCode) {
    const err: any = new Error(`Le code département ${code} est déjà utilisé.`)
    err.statusCode = 400
    throw err
  }

  if (input.managerEmployeeId) {
    const mgr = await prisma.employee.findFirst({
      where: { id: input.managerEmployeeId, tenantId }
    })
    if (!mgr) {
      const err: any = new Error('Responsable de département introuvable.')
      err.statusCode = 400
      throw err
    }
  }

  const department = await prisma.department.create({
    data: {
      tenantId,
      code,
      name,
      description: input.description?.trim() || null,
      managerEmployeeId: input.managerEmployeeId || null,
      createdById: actor.id
    },
    include: {
      managerEmployee: {
        select: { id: true, employeeNumber: true, displayName: true }
      }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_DEPARTMENT_CREATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'Department',
    entityId: department.id,
    entityReference: department.code,
    metadata: { code: department.code, name: department.name }
  })

  return department
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const dept = await prisma.department.findFirst({
    where: { id, tenantId }
  })

  if (!dept) {
    const err: any = new Error('Département introuvable.')
    err.statusCode = 404
    throw err
  }

  if (input.version === undefined || input.version !== dept.version) {
    const err: any = new Error('Le département a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  const updated = await prisma.department.update({
    where: { id },
    data: {
      name: input.name !== undefined ? input.name.trim() : dept.name,
      description: input.description !== undefined ? (input.description?.trim() || null) : dept.description,
      managerEmployeeId: input.managerEmployeeId !== undefined ? (input.managerEmployeeId || null) : dept.managerEmployeeId,
      isActive: input.isActive !== undefined ? input.isActive : dept.isActive,
      version: dept.version + 1,
      updatedById: actor.id
    },
    include: {
      managerEmployee: {
        select: { id: true, employeeNumber: true, displayName: true }
      }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_DEPARTMENT_UPDATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'Department',
    entityId: updated.id,
    entityReference: updated.code,
    metadata: { code: updated.code, version: updated.version }
  })

  return updated
}

export async function archiveDepartment(id: string, input: ArchiveInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const dept = await prisma.department.findFirst({
    where: { id, tenantId }
  })

  if (!dept) {
    const err: any = new Error('Département introuvable.')
    err.statusCode = 404
    throw err
  }

  if (input.version === undefined || input.version !== dept.version) {
    const err: any = new Error('Le département a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  const expectedConfirm = `ARCHIVER ${dept.code}`
  if (input.confirmCode?.trim() !== expectedConfirm) {
    const err: any = new Error(`Code de confirmation incorrect. Saisissez exactement "${expectedConfirm}".`)
    err.statusCode = 400
    throw err
  }

  if (!input.archiveReason?.trim()) {
    const err: any = new Error('Le motif d’archivage est obligatoire.')
    err.statusCode = 400
    throw err
  }

  const archived = await prisma.department.update({
    where: { id },
    data: {
      isActive: false,
      archivedAt: new Date(),
      archivedById: actor.id,
      archiveReason: input.archiveReason.trim(),
      version: dept.version + 1
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_DEPARTMENT_ARCHIVED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'Department',
    entityId: archived.id,
    entityReference: archived.code,
    metadata: { code: archived.code, reason: archived.archiveReason }
  })

  return archived
}

export async function restoreDepartment(id: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const dept = await prisma.department.findFirst({
    where: { id, tenantId }
  })

  if (!dept) {
    const err: any = new Error('Département introuvable.')
    err.statusCode = 404
    throw err
  }

  const restored = await prisma.department.update({
    where: { id },
    data: {
      isActive: true,
      archivedAt: null,
      archivedById: null,
      archiveReason: null,
      version: dept.version + 1,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_DEPARTMENT_RESTORED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'Department',
    entityId: restored.id,
    entityReference: restored.code,
    metadata: { code: restored.code }
  })

  return restored
}

// --- POSITION SERVICES ---

export interface CreatePositionInput {
  departmentId: string
  code: string
  title: string
  description?: string
  responsibilities?: string
  isManagerial?: boolean
  standardWeeklyMinutes?: number
  salaryReferenceMin?: number
  salaryReferenceMax?: number
  currency?: string
}

export interface UpdatePositionInput {
  version: number
  departmentId?: string
  title?: string
  description?: string
  responsibilities?: string
  isManagerial?: boolean
  standardWeeklyMinutes?: number | null
  salaryReferenceMin?: number | null
  salaryReferenceMax?: number | null
  currency?: string
  isActive?: boolean
}

export async function getPositions(query: {
  departmentId?: string
  search?: string
  isActive?: boolean
  isArchived?: boolean
  page?: number
  limit?: number
}, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.PositionWhereInput = { tenantId }

  if (query.departmentId) where.departmentId = query.departmentId

  if (query.isArchived !== undefined) {
    where.archivedAt = query.isArchived ? { not: null } : null
  } else {
    where.archivedAt = null
  }

  if (query.isActive !== undefined) {
    where.isActive = query.isActive
  }

  if (query.search?.trim()) {
    const q = query.search.trim()
    where.OR = [
      { code: { contains: q, mode: 'insensitive' } },
      { title: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [total, positions] = await Promise.all([
    prisma.position.count({ where }),
    prisma.position.findMany({
      where,
      skip,
      take: limit,
      orderBy: { code: 'asc' },
      include: {
        department: {
          select: { id: true, code: true, name: true }
        },
        _count: {
          select: { assignments: true, contracts: true }
        }
      }
    })
  ])

  return {
    data: positions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export async function createPosition(input: CreatePositionInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const code = input.code.trim().toUpperCase()
  const title = input.title.trim()

  if (!code || !title || !input.departmentId) {
    const err: any = new Error('Le département, le code et l’intitulé du poste sont obligatoires.')
    err.statusCode = 400
    throw err
  }

  const dept = await prisma.department.findFirst({
    where: { id: input.departmentId, tenantId }
  })
  if (!dept || !dept.isActive) {
    const err: any = new Error('Département sélectionné introuvable ou inactif.')
    err.statusCode = 400
    throw err
  }

  const existingCode = await prisma.position.findUnique({
    where: { tenantId_code: { tenantId, code } }
  })
  if (existingCode) {
    const err: any = new Error(`Le code poste ${code} est déjà utilisé.`)
    err.statusCode = 400
    throw err
  }

  const position = await prisma.position.create({
    data: {
      tenantId,
      departmentId: input.departmentId,
      code,
      title,
      description: input.description?.trim() || null,
      responsibilities: input.responsibilities?.trim() || null,
      isManagerial: input.isManagerial ?? false,
      standardWeeklyMinutes: input.standardWeeklyMinutes ?? 2640,
      salaryReferenceMin: input.salaryReferenceMin !== undefined ? new Prisma.Decimal(input.salaryReferenceMin) : null,
      salaryReferenceMax: input.salaryReferenceMax !== undefined ? new Prisma.Decimal(input.salaryReferenceMax) : null,
      currency: input.currency || 'MAD',
      createdById: actor.id
    },
    include: {
      department: {
        select: { id: true, code: true, name: true }
      }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_POSITION_CREATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'Position',
    entityId: position.id,
    entityReference: position.code,
    metadata: { code: position.code, title: position.title, department: dept.name }
  })

  return position
}

export async function updatePosition(id: string, input: UpdatePositionInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const pos = await prisma.position.findFirst({
    where: { id, tenantId }
  })

  if (!pos) {
    const err: any = new Error('Poste introuvable.')
    err.statusCode = 404
    throw err
  }

  if (input.version === undefined || input.version !== pos.version) {
    const err: any = new Error('Le poste a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  if (input.departmentId && input.departmentId !== pos.departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: input.departmentId, tenantId }
    })
    if (!dept || !dept.isActive) {
      const err: any = new Error('Département sélectionné introuvable ou inactif.')
      err.statusCode = 400
      throw err
    }
  }

  const updated = await prisma.position.update({
    where: { id },
    data: {
      departmentId: input.departmentId !== undefined ? input.departmentId : pos.departmentId,
      title: input.title !== undefined ? input.title.trim() : pos.title,
      description: input.description !== undefined ? (input.description?.trim() || null) : pos.description,
      responsibilities: input.responsibilities !== undefined ? (input.responsibilities?.trim() || null) : pos.responsibilities,
      isManagerial: input.isManagerial !== undefined ? input.isManagerial : pos.isManagerial,
      standardWeeklyMinutes: input.standardWeeklyMinutes !== undefined ? (input.standardWeeklyMinutes ?? null) : pos.standardWeeklyMinutes,
      salaryReferenceMin: input.salaryReferenceMin !== undefined ? (input.salaryReferenceMin !== null ? new Prisma.Decimal(input.salaryReferenceMin) : null) : pos.salaryReferenceMin,
      salaryReferenceMax: input.salaryReferenceMax !== undefined ? (input.salaryReferenceMax !== null ? new Prisma.Decimal(input.salaryReferenceMax) : null) : pos.salaryReferenceMax,
      currency: input.currency !== undefined ? input.currency : pos.currency,
      isActive: input.isActive !== undefined ? input.isActive : pos.isActive,
      version: pos.version + 1,
      updatedById: actor.id
    },
    include: {
      department: {
        select: { id: true, code: true, name: true }
      }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_POSITION_UPDATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'Position',
    entityId: updated.id,
    entityReference: updated.code,
    metadata: { code: updated.code, version: updated.version }
  })

  return updated
}

export async function archivePosition(id: string, input: ArchiveInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const pos = await prisma.position.findFirst({
    where: { id, tenantId }
  })

  if (!pos) {
    const err: any = new Error('Poste introuvable.')
    err.statusCode = 404
    throw err
  }

  if (input.version === undefined || input.version !== pos.version) {
    const err: any = new Error('Le poste a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  const expectedConfirm = `ARCHIVER ${pos.code}`
  if (input.confirmCode?.trim() !== expectedConfirm) {
    const err: any = new Error(`Code de confirmation incorrect. Saisissez exactement "${expectedConfirm}".`)
    err.statusCode = 400
    throw err
  }

  if (!input.archiveReason?.trim()) {
    const err: any = new Error('Le motif d’archivage est obligatoire.')
    err.statusCode = 400
    throw err
  }

  const archived = await prisma.position.update({
    where: { id },
    data: {
      isActive: false,
      archivedAt: new Date(),
      archivedById: actor.id,
      archiveReason: input.archiveReason.trim(),
      version: pos.version + 1
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_POSITION_ARCHIVED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'Position',
    entityId: archived.id,
    entityReference: archived.code,
    metadata: { code: archived.code, reason: archived.archiveReason }
  })

  return archived
}

export async function restorePosition(id: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const pos = await prisma.position.findFirst({
    where: { id, tenantId }
  })

  if (!pos) {
    const err: any = new Error('Poste introuvable.')
    err.statusCode = 404
    throw err
  }

  const restored = await prisma.position.update({
    where: { id },
    data: {
      isActive: true,
      archivedAt: null,
      archivedById: null,
      archiveReason: null,
      version: pos.version + 1,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_POSITION_RESTORED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'Position',
    entityId: restored.id,
    entityReference: restored.code,
    metadata: { code: restored.code }
  })

  return restored
}
