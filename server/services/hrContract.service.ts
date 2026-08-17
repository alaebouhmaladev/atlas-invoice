import { ContractStatus, ContractType, Prisma } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import { getCompanySettings } from './companySettings.service'
import { hasHrPermission } from '../utils/hrPermissions'
import type { UserPublic } from '~/types/auth'

export interface CreateContractInput {
  employeeId: string
  contractType?: ContractType
  startDate: string
  endDate?: string | null
  trialStartDate?: string | null
  trialEndDate?: string | null
  siteId?: string | null
  departmentId?: string | null
  positionId?: string | null
  managerEmployeeId?: string | null
  baseSalary: number
  currency?: string
  standardWeeklyMinutes?: number
  notes?: string
}

export interface UpdateContractInput {
  version: number
  contractType?: ContractType
  startDate?: string
  endDate?: string | null
  trialStartDate?: string | null
  trialEndDate?: string | null
  siteId?: string | null
  departmentId?: string | null
  positionId?: string | null
  managerEmployeeId?: string | null
  baseSalary?: number
  currency?: string
  standardWeeklyMinutes?: number
  notes?: string
}

export interface TerminateContractInput {
  version: number
  terminatedAt: string
  terminationReason: string
}

export interface RenewContractInput {
  version: number
  startDate: string
  endDate?: string | null
  contractType?: ContractType
  baseSalary?: number
  siteId?: string | null
  departmentId?: string | null
  positionId?: string | null
  managerEmployeeId?: string | null
  notes?: string
}

/**
 * Generate next contract number inside tenant (CTR-YYYY-0001)
 */
export async function generateNextContractNumber(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear()
  const sequenceType = `CONTRACT_${tenantId}_${currentYear}`

  const seq = await prisma.documentSequence.upsert({
    where: {
      type_year: {
        type: sequenceType,
        year: currentYear
      }
    },
    update: {
      lastNumber: { increment: 1 }
    },
    create: {
      type: sequenceType,
      year: currentYear,
      lastNumber: 1
    }
  })

  const paddedNumber = String(seq.lastNumber).padStart(4, '0')
  return `CTR-${currentYear}-${paddedNumber}`
}

/**
 * Get contracts list with search, filtering, and optional salary masking
 */
export async function getContracts(query: {
  employeeId?: string
  siteId?: string
  status?: ContractStatus
  contractType?: ContractType
  expiringInDays?: number
  search?: string
  page?: number
  limit?: number
}, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const page = Math.max(1, query.page || 1)
  const limit = Math.min(100, Math.max(1, query.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.EmploymentContractWhereInput = { tenantId }

  if (query.employeeId) where.employeeId = query.employeeId
  if (query.siteId) where.siteId = query.siteId
  if (query.status) where.status = query.status
  if (query.contractType) where.contractType = query.contractType

  if (query.expiringInDays !== undefined) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + query.expiringInDays)
    where.status = ContractStatus.ACTIVE
    where.endDate = {
      not: null,
      lte: targetDate
    }
  }

  if (query.search?.trim()) {
    const q = query.search.trim()
    where.OR = [
      { contractNumber: { contains: q, mode: 'insensitive' } },
      { employeeNameSnapshot: { contains: q, mode: 'insensitive' } },
      { employeeNumberSnapshot: { contains: q, mode: 'insensitive' } }
    ]
  }

  const [total, contracts] = await Promise.all([
    prisma.employmentContract.count({ where }),
    prisma.employmentContract.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: { select: { id: true, employeeNumber: true, displayName: true } },
        site: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        position: { select: { id: true, code: true, title: true } },
        managerEmployee: { select: { id: true, employeeNumber: true, displayName: true } },
        renewedFromContract: { select: { id: true, contractNumber: true, status: true } },
        renewedToContract: { select: { id: true, contractNumber: true, status: true } },
        _count: { select: { documents: true } }
      }
    })
  ])

  const canViewSalary = hasHrPermission(actor, 'hr.contract.view_salary')

  const sanitized = contracts.map(c => {
    if (!canViewSalary) {
      return {
        ...c,
        salarySnapshot: undefined
      }
    }
    return c
  })

  return {
    data: sanitized,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Get contract details by ID
 */
export async function getContractById(id: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const contract = await prisma.employmentContract.findFirst({
    where: { id, tenantId },
    include: {
      employee: { select: { id: true, employeeNumber: true, displayName: true, hireDate: true } },
      site: { select: { id: true, code: true, name: true } },
      department: { select: { id: true, code: true, name: true } },
      position: { select: { id: true, code: true, title: true } },
      managerEmployee: { select: { id: true, employeeNumber: true, displayName: true } },
      renewedFromContract: { select: { id: true, contractNumber: true, status: true, startDate: true, endDate: true } },
      renewedToContract: { select: { id: true, contractNumber: true, status: true, startDate: true, endDate: true } },
      documents: {
        where: { archivedAt: null },
        include: {
          currentVersion: true
        }
      }
    }
  })

  if (!contract) {
    const err: any = new Error('Contrat introuvable.')
    err.statusCode = 404
    throw err
  }

  const canViewSalary = hasHrPermission(actor, 'hr.contract.view_salary')
  if (!canViewSalary) {
    delete (contract as any).salarySnapshot
  }

  return contract
}

/**
 * Create a new draft contract
 */
export async function createContract(input: CreateContractInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const startDate = new Date(input.startDate)

  if (isNaN(startDate.getTime())) {
    const err: any = new Error('La date de début de contrat est invalide.')
    err.statusCode = 400
    throw err
  }

  if (input.endDate) {
    const endDate = new Date(input.endDate)
    if (endDate < startDate) {
      const err: any = new Error('La date de fin de contrat ne peut pas être antérieure à la date de début.')
      err.statusCode = 400
      throw err
    }
  }

  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, tenantId }
  })
  if (!employee) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  const contractNumber = await generateNextContractNumber(tenantId)
  const companySettings = await getCompanySettings()

  // Load snapshots if structure ids provided
  let siteName: string | null = null
  let deptName: string | null = null
  let posTitle: string | null = null

  if (input.siteId) {
    const s = await prisma.workSite.findUnique({ where: { id: input.siteId } })
    siteName = s?.name || null
  }
  if (input.departmentId) {
    const d = await prisma.department.findUnique({ where: { id: input.departmentId } })
    deptName = d?.name || null
  }
  if (input.positionId) {
    const p = await prisma.position.findUnique({ where: { id: input.positionId } })
    posTitle = p?.title || null
  }

  const contract = await prisma.employmentContract.create({
    data: {
      tenantId,
      employeeId: input.employeeId,
      contractNumber,
      contractType: input.contractType || ContractType.CDI,
      status: ContractStatus.DRAFT,
      startDate,
      endDate: input.endDate ? new Date(input.endDate) : null,
      trialStartDate: input.trialStartDate ? new Date(input.trialStartDate) : null,
      trialEndDate: input.trialEndDate ? new Date(input.trialEndDate) : null,
      siteId: input.siteId || null,
      departmentId: input.departmentId || null,
      positionId: input.positionId || null,
      managerEmployeeId: input.managerEmployeeId || null,
      salarySnapshot: new Prisma.Decimal(input.baseSalary || 0),
      currency: input.currency || 'MAD',
      standardWeeklyMinutes: input.standardWeeklyMinutes ?? 2640,
      employeeNameSnapshot: employee.displayName,
      employeeNumberSnapshot: employee.employeeNumber,
      siteSnapshot: siteName,
      departmentSnapshot: deptName,
      positionSnapshot: posTitle,
      companySnapshot: {
        legalName: companySettings.legalName,
        tradeName: companySettings.tradeName,
        ice: companySettings.ice,
        rc: companySettings.rc
      },
      notes: input.notes?.trim() || null,
      createdById: actor.id
    },
    include: {
      employee: { select: { id: true, employeeNumber: true, displayName: true } },
      site: { select: { id: true, code: true, name: true } },
      department: { select: { id: true, code: true, name: true } },
      position: { select: { id: true, code: true, title: true } }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_CONTRACT_CREATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EmploymentContract',
    entityId: contract.id,
    entityReference: contract.contractNumber,
    metadata: {
      contractNumber: contract.contractNumber,
      employeeNumber: employee.employeeNumber,
      contractType: contract.contractType
    }
  })

  return contract
}

/**
 * Update a draft contract with optimistic concurrency
 */
export async function updateContract(id: string, input: UpdateContractInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const contract = await prisma.employmentContract.findFirst({
    where: { id, tenantId }
  })

  if (!contract) {
    const err: any = new Error('Contrat introuvable.')
    err.statusCode = 404
    throw err
  }

  if (contract.status !== ContractStatus.DRAFT) {
    const err: any = new Error('Seul un contrat au statut Brouillon peut être modifié.')
    err.statusCode = 400
    throw err
  }

  if (input.version === undefined || input.version !== contract.version) {
    const err: any = new Error('Le contrat a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  const updateData: Prisma.EmploymentContractUpdateInput = {
    version: contract.version + 1,
    updatedBy: { connect: { id: actor.id } }
  }

  if (input.contractType) updateData.contractType = input.contractType
  if (input.startDate) updateData.startDate = new Date(input.startDate)
  if (input.endDate !== undefined) updateData.endDate = input.endDate ? new Date(input.endDate) : null
  if (input.trialStartDate !== undefined) updateData.trialStartDate = input.trialStartDate ? new Date(input.trialStartDate) : null
  if (input.trialEndDate !== undefined) updateData.trialEndDate = input.trialEndDate ? new Date(input.trialEndDate) : null
  if (input.baseSalary !== undefined) updateData.salarySnapshot = new Prisma.Decimal(input.baseSalary)
  if (input.currency) updateData.currency = input.currency
  if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null

  if (input.siteId !== undefined) {
    updateData.site = input.siteId ? { connect: { id: input.siteId } } : { disconnect: true }
    if (input.siteId) {
      const s = await prisma.workSite.findUnique({ where: { id: input.siteId } })
      updateData.siteSnapshot = s?.name || null
    } else {
      updateData.siteSnapshot = null
    }
  }

  if (input.departmentId !== undefined) {
    updateData.department = input.departmentId ? { connect: { id: input.departmentId } } : { disconnect: true }
    if (input.departmentId) {
      const d = await prisma.department.findUnique({ where: { id: input.departmentId } })
      updateData.departmentSnapshot = d?.name || null
    } else {
      updateData.departmentSnapshot = null
    }
  }

  if (input.positionId !== undefined) {
    updateData.position = input.positionId ? { connect: { id: input.positionId } } : { disconnect: true }
    if (input.positionId) {
      const p = await prisma.position.findUnique({ where: { id: input.positionId } })
      updateData.positionSnapshot = p?.title || null
    } else {
      updateData.positionSnapshot = null
    }
  }

  const updated = await prisma.employmentContract.update({
    where: { id },
    data: updateData,
    include: {
      employee: { select: { id: true, employeeNumber: true, displayName: true } },
      site: { select: { id: true, code: true, name: true } },
      department: { select: { id: true, code: true, name: true } },
      position: { select: { id: true, code: true, title: true } }
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_CONTRACT_UPDATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EmploymentContract',
    entityId: updated.id,
    entityReference: updated.contractNumber,
    metadata: { contractNumber: updated.contractNumber, version: updated.version }
  })

  return updated
}

/**
 * Activate a contract (freezes snapshots and signs)
 */
export async function activateContract(id: string, version: number, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const contract = await prisma.employmentContract.findFirst({
    where: { id, tenantId }
  })

  if (!contract) {
    const err: any = new Error('Contrat introuvable.')
    err.statusCode = 404
    throw err
  }

  if (contract.status !== ContractStatus.DRAFT) {
    const err: any = new Error('Seul un contrat au statut Brouillon peut être activé.')
    err.statusCode = 400
    throw err
  }

  if (version === undefined || version !== contract.version) {
    const err: any = new Error('Le contrat a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  const activated = await prisma.$transaction(async (tx) => {
    // If this contract was renewed from another contract, mark the previous contract as RENEWED
    if (contract.renewedFromContractId) {
      await tx.employmentContract.update({
        where: { id: contract.renewedFromContractId },
        data: {
          status: ContractStatus.RENEWED
        }
      })
    }

    return tx.employmentContract.update({
      where: { id },
      data: {
        status: ContractStatus.ACTIVE,
        signedAt: new Date(),
        version: contract.version + 1,
        updatedById: actor.id
      },
      include: {
        employee: { select: { id: true, employeeNumber: true, displayName: true } }
      }
    })
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_CONTRACT_ACTIVATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EmploymentContract',
    entityId: activated.id,
    entityReference: activated.contractNumber,
    metadata: { contractNumber: activated.contractNumber, employeeNumber: activated.employee.employeeNumber }
  })

  await createNotification({
    recipientRole: 'SUPER_ADMIN',
    type: 'HR_INFO',
    severity: 'INFO',
    title: 'Contrat activé',
    message: `Le contrat ${activated.contractNumber} de l’employé ${activated.employee.displayName} a été activé.`,
    actionUrl: `/rh/contrats`
  })

  return activated
}

/**
 * Renew an active or expired contract (creates new draft contract linked via renewedFromContractId)
 */
export async function renewContract(contractId: string, input: RenewContractInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const oldContract = await prisma.employmentContract.findFirst({
    where: { id: contractId, tenantId },
    include: { employee: true }
  })

  if (!oldContract) {
    const err: any = new Error('Contrat d’origine introuvable.')
    err.statusCode = 404
    throw err
  }

  if (input.version === undefined || input.version !== oldContract.version) {
    const err: any = new Error('Le contrat a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  const existingRenewed = await prisma.employmentContract.findUnique({
    where: { renewedFromContractId: contractId }
  })

  if (existingRenewed) {
    const err: any = new Error(`Ce contrat a déjà été renouvelé par le contrat ${existingRenewed.contractNumber}.`)
    err.statusCode = 400
    throw err
  }

  const newContractNumber = await generateNextContractNumber(tenantId)
  const startDate = new Date(input.startDate)

  const newContract = await createContract({
    employeeId: oldContract.employeeId,
    contractType: input.contractType || oldContract.contractType,
    startDate: input.startDate,
    endDate: input.endDate || null,
    siteId: input.siteId !== undefined ? input.siteId : oldContract.siteId,
    departmentId: input.departmentId !== undefined ? input.departmentId : oldContract.departmentId,
    positionId: input.positionId !== undefined ? input.positionId : oldContract.positionId,
    managerEmployeeId: input.managerEmployeeId !== undefined ? input.managerEmployeeId : oldContract.managerEmployeeId,
    baseSalary: input.baseSalary !== undefined ? input.baseSalary : Number(oldContract.salarySnapshot),
    currency: oldContract.currency,
    notes: input.notes || `Renouvellement du contrat ${oldContract.contractNumber}`
  }, actor)

  // Link renewedFromContractId
  const linkedNewContract = await prisma.employmentContract.update({
    where: { id: newContract.id },
    data: {
      renewedFromContractId: oldContract.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_CONTRACT_RENEWED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EmploymentContract',
    entityId: linkedNewContract.id,
    entityReference: linkedNewContract.contractNumber,
    metadata: {
      previousContractNumber: oldContract.contractNumber,
      newContractNumber: linkedNewContract.contractNumber
    }
  })

  return linkedNewContract
}

/**
 * Terminate an active contract
 */
export async function terminateContract(id: string, input: TerminateContractInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const contract = await prisma.employmentContract.findFirst({
    where: { id, tenantId }
  })

  if (!contract) {
    const err: any = new Error('Contrat introuvable.')
    err.statusCode = 404
    throw err
  }

  if (contract.status !== ContractStatus.ACTIVE) {
    const err: any = new Error('Seul un contrat Actif peut être résilié.')
    err.statusCode = 400
    throw err
  }

  if (input.version === undefined || input.version !== contract.version) {
    const err: any = new Error('Le contrat a été modifié par un autre utilisateur. Veuillez rafraîchir.')
    err.statusCode = 409
    throw err
  }

  if (!input.terminationReason?.trim()) {
    const err: any = new Error('Le motif de résiliation est obligatoire.')
    err.statusCode = 400
    throw err
  }

  const terminated = await prisma.employmentContract.update({
    where: { id },
    data: {
      status: ContractStatus.TERMINATED,
      terminatedAt: new Date(input.terminatedAt),
      terminationReason: input.terminationReason.trim(),
      version: contract.version + 1,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_CONTRACT_TERMINATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EmploymentContract',
    entityId: terminated.id,
    entityReference: terminated.contractNumber,
    metadata: { contractNumber: terminated.contractNumber, reason: terminated.terminationReason }
  })

  return terminated
}
