import { DocumentCategory } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { hasHrPermission } from '../utils/hrPermissions'
import type { UserPublic } from '~/types/auth'

async function scopedRequest(tenantId: string, requestId: string, actor: UserPublic) {
  const request = await prisma.leaveRequest.findFirst({ where: { id: requestId, tenantId }, include: { employee: true } })
  if (!request) throw new Error('Demande de congé introuvable.')
  const own = request.employee.linkedUserId === actor.id
  if (!own && !hasHrPermission(actor, 'hr.leave.attachment.read')) {
    const error: any = new Error('Vous ne pouvez pas accéder aux justificatifs de cette demande.')
    error.statusCode = 403
    throw error
  }
  return request
}

export async function listLeaveAttachments(tenantId: string, requestId: string, actor: UserPublic) {
  await scopedRequest(tenantId, requestId, actor)
  const canReadMedical = hasHrPermission(actor, 'hr.leave.attachment.medical') || hasHrPermission(actor, 'hr.document.read_medical')
  return prisma.leaveRequestAttachment.findMany({
    where: { tenantId, leaveRequestId: requestId, ...(canReadMedical ? {} : { isMedical: false }) },
    select: { id: true, isMedical: true, createdAt: true, document: { select: { id: true, category: true, currentVersion: { select: { id: true, safeDisplayName: true, mimeType: true, fileSize: true, sha256: true } } } } },
    orderBy: { createdAt: 'asc' }
  })
}

export async function attachLeaveDocument(tenantId: string, requestId: string, documentId: string, actor: UserPublic) {
  const request = await scopedRequest(tenantId, requestId, actor)
  if (!['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'PENDING_MANAGER', 'PENDING_HR'].includes(request.status)) throw new Error('Aucun justificatif ne peut être ajouté à cette étape.')
  const document = await prisma.employeeDocument.findFirst({ where: { id: documentId, tenantId, employeeId: request.employeeId, archivedAt: null }, include: { currentVersion: true } })
  if (!document?.currentVersion) throw new Error('Le justificatif doit contenir un fichier validé.')
  const attachment = await prisma.leaveRequestAttachment.upsert({
    where: { tenantId_leaveRequestId_documentId: { tenantId, leaveRequestId: requestId, documentId } },
    create: { tenantId, leaveRequestId: requestId, documentId, isMedical: document.category === DocumentCategory.MEDICAL, uploadedById: actor.id },
    update: {}
  })
  await prisma.leaveRequest.update({ where: { id: requestId }, data: { documentId, attachmentStatus: 'PROVIDED', version: { increment: 1 } } })
  await createAuditEntry({ userId: actor.id, action: 'HR_LEAVE_ATTACHMENT_LINKED', category: 'HR_LEAVE', entityType: 'LeaveRequestAttachment', entityId: attachment.id, metadata: { tenantId, leaveRequestId: requestId, medical: document.category === DocumentCategory.MEDICAL } })
  return { id: attachment.id, isMedical: attachment.isMedical, status: 'PROVIDED' }
}
