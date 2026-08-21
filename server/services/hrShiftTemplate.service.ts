import { ShiftSegmentType } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import type { UserPublic } from '~/types/auth'

export interface ShiftTemplateSegmentInput {
  order: number
  startLocalTime: string // "HH:MM"
  endLocalTime: string // "HH:MM"
  endsNextDay?: boolean
  segmentType?: ShiftSegmentType
}

export interface CreateShiftTemplateInput {
  siteId: string
  code: string
  name: string
  color?: string
  description?: string
  isDayOff?: boolean
  segments?: ShiftTemplateSegmentInput[]
}

export interface UpdateShiftTemplateInput {
  name?: string
  color?: string
  description?: string
  isDayOff?: boolean
  isActive?: boolean
  segments?: ShiftTemplateSegmentInput[]
}

/**
 * Calculates work minutes for a start/end time pair.
 */
export function calculateSegmentMinutes(start: string, end: string, endsNextDay = false): number {
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)

  let startTotal = startH * 60 + startM
  let endTotal = endH * 60 + endM

  if (endsNextDay || endTotal <= startTotal) {
    endTotal += 24 * 60
  }

  return Math.max(0, endTotal - startTotal)
}

/**
 * Validates array of template segments.
 */
export function validateSegments(segments: ShiftTemplateSegmentInput[]): void {
  if (!segments || segments.length === 0) return

  const sorted = [...segments].sort((a, b) => a.order - b.order)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

  for (const seg of sorted) {
    if (!timeRegex.test(seg.startLocalTime) || !timeRegex.test(seg.endLocalTime)) {
      throw new Error(`Format d’heure invalide (${seg.startLocalTime} - ${seg.endLocalTime}). Utilisez le format HH:MM.`)
    }
  }

  // Check overlap among segments
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    const aStart = a.startLocalTime
    const aEnd = a.endLocalTime + (a.endsNextDay ? ' (+1d)' : '')

    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]
      const aMinsStart = calculateSegmentMinutes('00:00', a.startLocalTime)
      const aMinsEnd = calculateSegmentMinutes('00:00', a.endLocalTime, a.endsNextDay)
      const bMinsStart = calculateSegmentMinutes('00:00', b.startLocalTime)
      const bMinsEnd = calculateSegmentMinutes('00:00', b.endLocalTime, b.endsNextDay)

      if (Math.max(aMinsStart, bMinsStart) < Math.min(aMinsEnd, bMinsEnd)) {
        throw new Error(`Chevauchement détecté entre les créneaux ${a.startLocalTime}-${a.endLocalTime} et ${b.startLocalTime}-${b.endLocalTime}.`)
      }
    }
  }
}

export async function createShiftTemplate(input: CreateShiftTemplateInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const site = await prisma.workSite.findFirst({
    where: { id: input.siteId, tenantId, archivedAt: null }
  })
  if (!site) {
    throw new Error('Site de travail introuvable ou archivé.')
  }

  const existingCode = await prisma.shiftTemplate.findFirst({
    where: { tenantId, siteId: input.siteId, code: input.code.toUpperCase().trim() }
  })
  if (existingCode) {
    throw new Error(`Un modèle de shift avec le code "${input.code}" existe déjà pour ce site.`)
  }

  const isDayOff = input.isDayOff ?? false
  const segmentsInput = isDayOff ? [] : (input.segments || [])

  if (!isDayOff && segmentsInput.length === 0) {
    throw new Error('Un modèle de shift de travail doit contenir au moins un créneau (segment).')
  }

  validateSegments(segmentsInput)

  const template = await prisma.$transaction(async (tx) => {
    const t = await tx.shiftTemplate.create({
      data: {
        tenantId,
        siteId: input.siteId,
        code: input.code.toUpperCase().trim(),
        name: input.name.trim(),
        color: input.color || '#f97316',
        description: input.description,
        isDayOff,
        createdById: actor.id
      }
    })

    if (segmentsInput.length > 0) {
      await tx.shiftTemplateSegment.createMany({
        data: segmentsInput.map((s, idx) => ({
          templateId: t.id,
          order: s.order || idx + 1,
          startLocalTime: s.startLocalTime,
          endLocalTime: s.endLocalTime,
          endsNextDay: s.endsNextDay ?? false,
          segmentType: s.segmentType || ShiftSegmentType.WORK
        }))
      })
    }

    return tx.shiftTemplate.findUnique({
      where: { id: t.id },
      include: { segments: { orderBy: { order: 'asc' } } }
    })
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SHIFT_TEMPLATE_CREATED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'ShiftTemplate',
    entityId: template?.id,
    entityReference: template?.code,
    metadata: { siteId: input.siteId, code: template?.code, isDayOff }
  })

  return template
}

export async function updateShiftTemplate(id: string, input: UpdateShiftTemplateInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const existing = await prisma.shiftTemplate.findFirst({
    where: { id, tenantId },
    include: { segments: true }
  })
  if (!existing) {
    throw new Error('Modèle de shift introuvable.')
  }

  const isDayOff = input.isDayOff ?? existing.isDayOff
  const segmentsInput = isDayOff ? [] : (input.segments !== undefined ? input.segments : existing.segments)

  if (!isDayOff && segmentsInput.length === 0) {
    throw new Error('Un modèle de shift de travail doit contenir au moins un créneau (segment).')
  }

  validateSegments(segmentsInput)

  const updated = await prisma.$transaction(async (tx) => {
    await tx.shiftTemplate.update({
      where: { id },
      data: {
        name: input.name ? input.name.trim() : undefined,
        color: input.color,
        description: input.description,
        isDayOff,
        isActive: input.isActive,
        updatedById: actor.id,
        version: { increment: 1 }
      }
    })

    if (input.segments !== undefined || isDayOff) {
      await tx.shiftTemplateSegment.deleteMany({ where: { templateId: id } })
      if (!isDayOff && segmentsInput.length > 0) {
        await tx.shiftTemplateSegment.createMany({
          data: segmentsInput.map((s, idx) => ({
            templateId: id,
            order: s.order || idx + 1,
            startLocalTime: s.startLocalTime,
            endLocalTime: s.endLocalTime,
            endsNextDay: s.endsNextDay ?? false,
            segmentType: s.segmentType || ShiftSegmentType.WORK
          }))
        })
      }
    }

    return tx.shiftTemplate.findUnique({
      where: { id },
      include: { segments: { orderBy: { order: 'asc' } } }
    })
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SHIFT_TEMPLATE_UPDATED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'ShiftTemplate',
    entityId: id,
    entityReference: updated?.code
  })

  return updated
}

export async function getShiftTemplates(siteId: string, actor: UserPublic, includeArchived = false) {
  const tenantId = actor.tenantId || 'default-tenant'

  return prisma.shiftTemplate.findMany({
    where: {
      tenantId,
      siteId,
      ...(includeArchived ? {} : { archivedAt: null, isActive: true })
    },
    include: { segments: { orderBy: { order: 'asc' } } },
    orderBy: { code: 'asc' }
  })
}

export async function archiveShiftTemplate(id: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const existing = await prisma.shiftTemplate.findFirst({
    where: { id, tenantId, archivedAt: null }
  })
  if (!existing) {
    throw new Error('Modèle de shift introuvable ou déjà archivé.')
  }

  const updated = await prisma.shiftTemplate.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      archivedById: actor.id,
      isActive: false
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SHIFT_TEMPLATE_ARCHIVED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'ShiftTemplate',
    entityId: id,
    entityReference: existing.code
  })

  return updated
}
