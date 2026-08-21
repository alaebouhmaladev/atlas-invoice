import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import type { UserPublic } from '~/types/auth'

export interface CreateStaffingRequirementInput {
  siteId: string
  positionId: string
  dayOfWeek: number // 0=Sunday... 6=Saturday
  startLocalTime: string // "12:00"
  endLocalTime: string // "15:00"
  minEmployees?: number
  preferredEmployees?: number | null
  effectiveFrom?: string
  effectiveTo?: string | null
}

export async function createStaffingRequirement(input: CreateStaffingRequirementInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const site = await prisma.workSite.findFirst({ where: { id: input.siteId, tenantId, archivedAt: null } })
  if (!site) throw new Error('Site introuvable ou archivé.')

  const pos = await prisma.position.findFirst({ where: { id: input.positionId, tenantId, archivedAt: null } })
  if (!pos) throw new Error('Poste introuvable ou archivé.')

  const req = await prisma.staffingRequirement.create({
    data: {
      tenantId,
      siteId: input.siteId,
      positionId: input.positionId,
      dayOfWeek: input.dayOfWeek,
      startLocalTime: input.startLocalTime,
      endLocalTime: input.endLocalTime,
      minEmployees: input.minEmployees ?? 1,
      preferredEmployees: input.preferredEmployees ?? null,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date('2020-01-01'),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      createdById: actor.id
    },
    include: { site: true, position: true }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_COVERAGE_REQUIREMENT_CREATED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'StaffingRequirement',
    entityId: req.id,
    entityReference: `${site.name} - ${pos.title}`,
    metadata: { siteId: input.siteId, positionId: input.positionId, dayOfWeek: input.dayOfWeek }
  })

  return req
}

export async function getStaffingRequirements(siteId: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  return prisma.staffingRequirement.findMany({
    where: { tenantId, siteId },
    include: { position: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startLocalTime: 'asc' }]
  })
}

export async function deleteStaffingRequirement(id: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const existing = await prisma.staffingRequirement.findFirst({ where: { id, tenantId } })
  if (!existing) throw new Error('Exigence de couverture introuvable.')

  await prisma.staffingRequirement.delete({ where: { id } })
}
