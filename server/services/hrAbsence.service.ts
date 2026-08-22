import type { AbsenceStatus } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import type { UserPublic } from '~/types/auth'

export async function listAbsences(
  tenantId: string,
  filters: { siteId?: string; employeeId?: string; status?: AbsenceStatus } = {},
  includePrivate = false
) {
  const rows = await prisma.absenceRecord.findMany({
    where: {
      tenantId,
      ...(filters.siteId ? { siteId: filters.siteId } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status } : {})
    },
    select: {
      id: true,
      localDate: true,
      source: true,
      status: true,
      detectedAt: true,
      resolvedAt: true,
      version: true,
      employee: { select: { id: true, employeeNumber: true, displayName: true } },
      site: { select: { id: true, code: true, name: true } },
      leaveRequestId: true,
      documentId: includePrivate,
      privateReason: includePrivate,
      privateResolutionNote: includePrivate
    },
    orderBy: [{ localDate: 'desc' }, { detectedAt: 'desc' }]
  })
  return rows
}

export async function resolveAbsence(
  tenantId: string,
  absenceId: string,
  input: { status: 'JUSTIFIED' | 'RESOLVED'; privateResolutionNote: string; documentId?: string | null },
  actor: UserPublic
) {
  if (input.privateResolutionNote.trim().length < 5) throw new Error('Une justification détaillée est obligatoire.')
  const absence = await prisma.absenceRecord.findFirst({ where: { id: absenceId, tenantId } })
  if (!absence) throw new Error('Absence introuvable.')
  if (input.documentId) {
    const document = await prisma.employeeDocument.findFirst({
      where: { id: input.documentId, tenantId, employeeId: absence.employeeId, archivedAt: null }
    })
    if (!document) throw new Error('Justificatif RH introuvable ou non autorisé.')
  }
  const updated = await prisma.absenceRecord.update({
    where: { id: absence.id },
    data: {
      status: input.status,
      documentId: input.documentId || null,
      privateResolutionNote: input.privateResolutionNote.trim(),
      resolvedAt: new Date(),
      resolvedById: actor.id,
      version: { increment: 1 }
    }
  })
  await createAuditEntry({
    userId: actor.id,
    action: 'HR_ABSENCE_RESOLVED',
    category: 'HR_LEAVE',
    entityType: 'AbsenceRecord',
    entityId: absence.id,
    entityReference: input.status,
    metadata: { tenantId, employeeId: absence.employeeId, localDate: absence.localDate.toISOString(), hasDocument: Boolean(input.documentId) }
  })
  return { id: updated.id, status: updated.status, resolvedAt: updated.resolvedAt }
}
