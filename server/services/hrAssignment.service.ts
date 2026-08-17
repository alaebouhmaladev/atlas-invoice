import { AssignmentType } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import type { UserPublic } from '~/types/auth'

export interface CreateAssignmentInput {
  employeeId: string
  siteId: string
  departmentId: string
  positionId: string
  managerEmployeeId?: string | null
  assignmentType?: AssignmentType
  isPrimary?: boolean
  startDate: string
  endDate?: string | null
  reason?: string
  notes?: string
}

export interface TransferEmployeeInput {
  employeeId: string
  effectiveDate: string
  newSiteId: string
  newDepartmentId: string
  newPositionId: string
  newManagerEmployeeId?: string | null
  assignmentType?: AssignmentType
  reason: string
  notes?: string
  endCurrentPrimary?: boolean
}

/**
 * Detect cycles in manager hierarchy
 */
export async function detectManagerCycle(employeeId: string, proposedManagerId: string, tenantId: string, tx?: any): Promise<boolean> {
  if (employeeId === proposedManagerId) return true

  const db = tx || prisma
  const visited = new Set<string>([employeeId])
  let currentId: string | null = proposedManagerId
  let depth = 0

  while (currentId && depth < 50) {
    if (visited.has(currentId)) {
      return true
    }
    visited.add(currentId)

    const mgrAssignment: { managerEmployeeId: string | null } | null = await db.employeeAssignment.findFirst({
      where: { tenantId, employeeId: currentId, isPrimary: true, endDate: null },
      select: { managerEmployeeId: true }
    })

    if (!mgrAssignment || !mgrAssignment.managerEmployeeId) {
      break
    }

    currentId = mgrAssignment.managerEmployeeId
    depth++
  }

  return false
}

/**
 * Get assignment history for an employee
 */
export async function getEmployeeAssignments(employeeId: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, tenantId }
  })

  if (!employee) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  const assignments = await prisma.employeeAssignment.findMany({
    where: { tenantId, employeeId },
    orderBy: { startDate: 'desc' },
    include: {
      site: { select: { id: true, code: true, name: true, type: true } },
      department: { select: { id: true, code: true, name: true } },
      position: { select: { id: true, code: true, title: true, isManagerial: true } },
      managerEmployee: { select: { id: true, employeeNumber: true, displayName: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      endedBy: { select: { id: true, name: true, email: true } }
    }
  })

  return assignments
}

/**
 * Create a new assignment or transfer an employee (transactional)
 */
export async function createAssignment(input: CreateAssignmentInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'
  const isPrimary = input.isPrimary ?? true
  const startDate = new Date(input.startDate)

  if (isNaN(startDate.getTime())) {
    const err: any = new Error('La date de début d’affectation est invalide.')
    err.statusCode = 400
    throw err
  }

  if (input.endDate) {
    const endDate = new Date(input.endDate)
    if (endDate < startDate) {
      const err: any = new Error('La date de fin ne peut pas être antérieure à la date de début.')
      err.statusCode = 400
      throw err
    }
  }

  // Validate employee
  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, tenantId }
  })
  if (!employee) {
    const err: any = new Error('Employé introuvable.')
    err.statusCode = 404
    throw err
  }

  if (employee.employmentStatus === 'ARCHIVED' || employee.employmentStatus === 'DEPARTED') {
    const err: any = new Error('Impossible d’affecter un employé archivé ou parti.')
    err.statusCode = 400
    throw err
  }

  // Validate structure elements
  const [site, dept, pos] = await Promise.all([
    prisma.workSite.findFirst({ where: { id: input.siteId, tenantId, isActive: true, archivedAt: null } }),
    prisma.department.findFirst({ where: { id: input.departmentId, tenantId, isActive: true, archivedAt: null } }),
    prisma.position.findFirst({ where: { id: input.positionId, tenantId, isActive: true, archivedAt: null } })
  ])

  if (!site) {
    const err: any = new Error('Site introuvable, inactif ou archivé.')
    err.statusCode = 400
    throw err
  }

  if (!dept) {
    const err: any = new Error('Département introuvable, inactif ou archivé.')
    err.statusCode = 400
    throw err
  }

  if (!pos) {
    const err: any = new Error('Poste introuvable, inactif ou archivé.')
    err.statusCode = 400
    throw err
  }

  if (pos.departmentId !== dept.id) {
    const err: any = new Error('Le poste sélectionné n’appartient pas à ce département.')
    err.statusCode = 400
    throw err
  }

  // Manager hierarchy cycle detection
  if (input.managerEmployeeId) {
    const isCycle = await detectManagerCycle(input.employeeId, input.managerEmployeeId, tenantId)
    if (isCycle) {
      const err: any = new Error('Cette affectation créerait une boucle dans la hiérarchie des responsables.')
      err.statusCode = 400
      throw err
    }
    const mgr = await prisma.employee.findFirst({ where: { id: input.managerEmployeeId, tenantId } })
    if (!mgr) {
      const err: any = new Error('Manager introuvable.')
      err.statusCode = 400
      throw err
    }
  }

  // Run in transaction: if primary assignment, end current active primary assignment
  const newAssignment = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      // End existing active primary assignment
      const currentActivePrimary = await tx.employeeAssignment.findFirst({
        where: { tenantId, employeeId: input.employeeId, isPrimary: true, endDate: null }
      })

      if (currentActivePrimary) {
        await tx.employeeAssignment.update({
          where: { id: currentActivePrimary.id },
          data: {
            endDate: startDate,
            endedById: actor.id,
            version: currentActivePrimary.version + 1
          }
        })
      }
    }

    return tx.employeeAssignment.create({
      data: {
        tenantId,
        employeeId: input.employeeId,
        siteId: input.siteId,
        departmentId: input.departmentId,
        positionId: input.positionId,
        managerEmployeeId: input.managerEmployeeId || null,
        assignmentType: input.assignmentType || AssignmentType.PERMANENT,
        isPrimary,
        startDate,
        endDate: input.endDate ? new Date(input.endDate) : null,
        reason: input.reason?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: actor.id
      },
      include: {
        site: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        position: { select: { id: true, code: true, title: true } },
        managerEmployee: { select: { id: true, employeeNumber: true, displayName: true } }
      }
    })
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_ASSIGNMENT_CREATED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EmployeeAssignment',
    entityId: newAssignment.id,
    entityReference: employee.employeeNumber,
    metadata: {
      employeeNumber: employee.employeeNumber,
      site: newAssignment.site.name,
      department: newAssignment.department.name,
      position: newAssignment.position.title,
      isPrimary: newAssignment.isPrimary
    }
  })

  return newAssignment
}

/**
 * Execute a controlled transfer or promotion workflow
 */
export async function transferEmployee(input: TransferEmployeeInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  if (!input.reason?.trim()) {
    const err: any = new Error('Le motif de mutation / promotion est obligatoire.')
    err.statusCode = 400
    throw err
  }

  const assignment = await createAssignment({
    employeeId: input.employeeId,
    siteId: input.newSiteId,
    departmentId: input.newDepartmentId,
    positionId: input.newPositionId,
    managerEmployeeId: input.newManagerEmployeeId,
    assignmentType: input.assignmentType || AssignmentType.TRANSFER,
    isPrimary: input.endCurrentPrimary !== false,
    startDate: input.effectiveDate,
    reason: input.reason.trim(),
    notes: input.notes?.trim() || undefined
  }, actor)

  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_EMPLOYEE_TRANSFERRED',
    category: 'HR',
    result: 'SUCCESS',
    entityType: 'EMPLOYEE',
    entityId: input.employeeId,
    entityReference: employee?.employeeNumber,
    metadata: {
      employeeNumber: employee?.employeeNumber,
      effectiveDate: input.effectiveDate,
      reason: input.reason,
      newSite: assignment.site.name,
      newPosition: assignment.position.title
    }
  })

  await createNotification({
    recipientRole: 'SUPER_ADMIN',
    type: 'HR_INFO',
    severity: 'INFO',
    title: 'Mutation d’employé',
    message: `L’employé ${employee?.displayName} (${employee?.employeeNumber}) a été muté vers ${assignment.site.name} (${assignment.position.title}) par ${actor.name}.`,
    actionUrl: `/rh/employes/${input.employeeId}`
  })

  return assignment
}
