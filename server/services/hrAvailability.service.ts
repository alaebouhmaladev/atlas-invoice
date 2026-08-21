import { AvailabilityStatus } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import type { UserPublic } from '~/types/auth'

export interface CreateAvailabilityInput {
  employeeId: string
  dayOfWeek?: number | null // 0=Sunday, 1=Monday... 6=Saturday
  specificDate?: string | null // "YYYY-MM-DD"
  startLocalTime?: string | null
  endLocalTime?: string | null
  status?: AvailabilityStatus
  reason?: string | null
  effectiveFrom?: string
  effectiveTo?: string | null
}

export async function createEmployeeAvailability(input: CreateAvailabilityInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const emp = await prisma.employee.findFirst({
    where: { id: input.employeeId, tenantId, archivedAt: null }
  })
  if (!emp) {
    throw new Error('Employé introuvable ou archivé.')
  }

  const availability = await prisma.employeeAvailability.create({
    data: {
      tenantId,
      employeeId: input.employeeId,
      dayOfWeek: input.dayOfWeek ?? null,
      specificDate: input.specificDate ? new Date(input.specificDate) : null,
      startLocalTime: input.startLocalTime || null,
      endLocalTime: input.endLocalTime || null,
      status: input.status || AvailabilityStatus.UNAVAILABLE,
      reason: input.reason || null,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date('2020-01-01'),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      createdById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_AVAILABILITY_CREATED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'EmployeeAvailability',
    entityId: availability.id,
    entityReference: `${emp.firstName} ${emp.lastName}`,
    metadata: { status: availability.status, dayOfWeek: input.dayOfWeek, specificDate: input.specificDate }
  })

  return availability
}

export async function getEmployeeAvailabilities(employeeId: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  return prisma.employeeAvailability.findMany({
    where: { tenantId, employeeId },
    orderBy: { createdAt: 'desc' }
  })
}

export async function deleteEmployeeAvailability(id: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const existing = await prisma.employeeAvailability.findFirst({
    where: { id, tenantId }
  })
  if (!existing) {
    throw new Error('Déclaration d’indisponibilité introuvable.')
  }

  await prisma.employeeAvailability.delete({ where: { id } })
}
