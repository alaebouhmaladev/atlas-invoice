import { prisma } from '../utils/db'
import { parseHrLocalDate } from '../utils/hrDates'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import { recordLeaveBalanceEntry } from './hrLeaveBalance.service'
import { calculateAttendanceDay } from './hrAttendanceCalculation.service'
import type { UserPublic } from '~/types/auth'
import { hasHrPermission } from '../utils/hrPermissions'

async function ensureAttendanceIntervalMutable(tx: any, request: any) {
  for (const day of request.days) {
    const lock = await tx.attendancePeriodLock.findFirst({
      where: {
        tenantId: request.tenantId,
        siteId: day.siteId || undefined,
        isLocked: true,
        periodStart: { lte: day.localDate },
        periodEnd: { gte: day.localDate }
      }
    })
    const attendance = await tx.attendanceDay.findUnique({
      where: {
        tenantId_employeeId_workDate: {
          tenantId: request.tenantId,
          employeeId: request.employeeId,
          workDate: day.localDate
        }
      }
    })
    if (lock || attendance?.validationStatus === 'LOCKED' || attendance?.validationStatus === 'APPROVED') {
      const err: any = new Error('La demande touche une période de présence validée ou verrouillée. Un déverrouillage explicite est requis.')
      err.statusCode = 409
      err.data = { code: 'LEAVE_ATTENDANCE_PERIOD_PROTECTED', localDate: day.localDate.toISOString().slice(0, 10) }
      throw err
    }
  }
}

async function projectApprovedLeave(tx: any, request: any) {
  for (const day of request.days) {
    if (!day.isWorkingDay || day.requestedMinutes <= 0 || !day.siteId) continue
    const localDate = parseHrLocalDate(day.localDate)
    const dateString = localDate.toISOString().slice(0, 10)
    const eventCount = await tx.attendanceEvent.count({
      where: { tenantId: request.tenantId, employeeId: request.employeeId, localDate: dateString }
    })
    if (eventCount > 0) continue

    const attendance = await tx.attendanceDay.upsert({
      where: {
        tenantId_employeeId_workDate: {
          tenantId: request.tenantId,
          employeeId: request.employeeId,
          workDate: localDate
        }
      },
      update: {
        status: 'ON_LEAVE',
        siteId: day.siteId,
        scheduledShiftId: day.scheduledShiftId,
        plannedMinutes: day.plannedMinutes,
        actualPresenceMinutes: 0,
        paidBreakMinutes: 0,
        unpaidBreakMinutes: 0,
        netWorkedMinutes: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        overtimeMinutes: 0,
        missingMinutes: 0,
        differenceMinutes: -day.plannedMinutes,
        version: { increment: 1 }
      },
      create: {
        tenantId: request.tenantId,
        employeeId: request.employeeId,
        siteId: day.siteId,
        workDate: localDate,
        status: 'ON_LEAVE',
        scheduledShiftId: day.scheduledShiftId,
        plannedMinutes: day.plannedMinutes,
        differenceMinutes: -day.plannedMinutes
      }
    })
    await tx.leaveRequestDay.update({ where: { id: day.id }, data: { attendanceDayId: attendance.id } })
    await tx.absenceRecord.upsert({
      where: { tenantId_employeeId_localDate: { tenantId: request.tenantId, employeeId: request.employeeId, localDate } },
      update: { status: 'JUSTIFIED', source: 'LEAVE_REQUEST', leaveRequestId: request.id, attendanceDayId: attendance.id },
      create: {
        tenantId: request.tenantId,
        employeeId: request.employeeId,
        siteId: day.siteId,
        localDate,
        attendanceDayId: attendance.id,
        leaveRequestId: request.id,
        source: 'LEAVE_REQUEST',
        status: 'JUSTIFIED'
      }
    })
  }
}

export async function reviewLeaveRequest(
  tenantId: string,
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
  privateNote: string | undefined,
  actor: UserPublic,
  options: { expectedVersion?: number; idempotencyKey?: string } = {}
) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${requestId}:leave-approval`}))`
    const request = await tx.leaveRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { days: true, leaveType: true, employee: true, approvalSteps: { orderBy: { sequence: 'asc' } } }
    })
    if (!request) throw new Error('Demande de congé introuvable.')
    if (!['PENDING_APPROVAL', 'SUBMITTED', 'PENDING_MANAGER', 'PENDING_HR'].includes(request.status)) {
      throw new Error('Cette demande ne peut plus être validée.')
    }
    if (options.expectedVersion !== undefined && request.version !== options.expectedVersion) {
      const error: any = new Error('Cette demande a été modifiée. Rechargez la page avant de décider.')
      error.statusCode = 409
      error.data = { code: 'LEAVE_VERSION_CONFLICT' }
      throw error
    }
    if (options.idempotencyKey) {
      const previous = await tx.leaveApprovalStep.findUnique({ where: { tenantId_decisionIdempotencyKey: { tenantId, decisionIdempotencyKey: options.idempotencyKey } } })
      if (previous) return { id: request.id, status: request.status, idempotent: true }
    }
    if (request.submittedById === actor.id) {
      await createAuditEntry({
        userId: actor.id,
        action: 'HR_LEAVE_SELF_APPROVAL_BLOCKED',
        category: 'SECURITY',
        result: 'FAILURE',
        entityType: 'LeaveRequest',
        entityId: request.id,
        metadata: { tenantId, submittedById: request.submittedById }
      })
      const err: any = new Error('Vous ne pouvez pas valider ou rejeter une demande que vous avez soumise.')
      err.statusCode = 403
      err.data = { code: 'LEAVE_SELF_APPROVAL_FORBIDDEN' }
      throw err
    }
    const step = request.approvalSteps.find(item => item.status === 'PENDING')
    if (!step) throw new Error('Aucune étape de validation en attente.')
    if (step.approverRole === 'HR_MANAGER' && !hasHrPermission(actor, 'hr.leave.review_hr')) {
      const error: any = new Error('La validation finale est réservée aux responsables RH autorisés.')
      error.statusCode = 403
      throw error
    }
    if (!step.approverRole && !hasHrPermission(actor, 'hr.leave.review_manager')) {
      const error: any = new Error('Vous ne pouvez pas traiter l’étape de validation manager.')
      error.statusCode = 403
      throw error
    }
    if (step.approverUserId && step.approverUserId !== actor.id) throw new Error('Cette étape est affectée à un autre approbateur.')
    if (step.approverRole && step.approverRole !== actor.role && actor.role !== 'SUPER_ADMIN') {
      throw new Error('Votre rôle ne permet pas de traiter cette étape.')
    }
    if (decision === 'REJECTED' && (!privateNote || privateNote.trim().length < 3)) {
      throw new Error('Un motif de refus est obligatoire.')
    }
    const planningImpact = (request.planningImpactSnapshot || {}) as Record<string, unknown>
    if (decision === 'APPROVED' && planningImpact.staffingWarning === true && planningImpact.blockOnCoverageWarning === true) {
      const error: any = new Error('La politique bloque cette approbation car elle créerait un sous-effectif. Ajustez le planning ou la politique avant de poursuivre.')
      error.statusCode = 409
      error.data = { code: 'LEAVE_STAFFING_COVERAGE_BLOCKED' }
      throw error
    }
    if (decision === 'APPROVED') await ensureAttendanceIntervalMutable(tx, request)

    const before = { status: request.status, approvedMinutes: request.approvedMinutes }
    const decided = await tx.leaveApprovalStep.updateMany({
      where: { id: step.id, status: 'PENDING', version: step.version },
      data: { status: decision, decisionById: actor.id, decidedAt: new Date(), privateNote: privateNote?.trim() || null, decisionIdempotencyKey: options.idempotencyKey || null, version: { increment: 1 } }
    })
    if (decided.count !== 1) throw new Error('Cette étape a déjà été traitée par un autre utilisateur.')

    const nextStep = decision === 'APPROVED'
      ? request.approvalSteps.find(item => item.sequence > step.sequence && item.status === 'PENDING')
      : null
    if (nextStep) {
      const nextStatus = nextStep.approverRole === 'HR_MANAGER' ? 'PENDING_HR' : 'PENDING_MANAGER'
      await tx.leaveRequest.update({
        where: { id: request.id },
        data: { status: nextStatus, currentApprovalSequence: nextStep.sequence, version: { increment: 1 } }
      })
      await tx.leaveRequestHistory.create({
        data: { tenantId, leaveRequestId: request.id, action: 'APPROVAL_STEP_COMPLETED', beforeSnapshot: { status: request.status, sequence: step.sequence }, afterSnapshot: { status: nextStatus, sequence: nextStep.sequence }, actorId: actor.id }
      })
      return { id: request.id, status: nextStatus }
    }

    if (decision === 'APPROVED') {
      if (request.leaveType.usesBalance) {
        const policySnapshot = (request.policySnapshot || {}) as any
        const year = request.startDate.getUTCFullYear()
        await recordLeaveBalanceEntry(tenantId, {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          periodStart: new Date(Date.UTC(year, 0, 1)),
          periodEnd: new Date(Date.UTC(year, 11, 31)),
          entryType: 'DEBIT',
          amountMinutes: request.requestedMinutes,
          effectiveDate: request.startDate,
          reason: `Débit après validation de la demande ${request.id}`,
          idempotencyKey: `leave:${request.id}:debit`,
          leaveRequestId: request.id,
          actorId: actor.id,
          allowNegativeBalance: policySnapshot.allowNegativeBalance === true
        }, tx)
      }
      await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          approvedMinutes: request.requestedMinutes,
          approvedAt: new Date(),
          privateDecisionNote: privateNote?.trim() || null,
          version: { increment: 1 }
        }
      })
      await projectApprovedLeave(tx, request)
    } else {
      if (request.leaveType.usesBalance) {
        const year = request.startDate.getUTCFullYear()
        await recordLeaveBalanceEntry(tenantId, {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          periodStart: new Date(Date.UTC(year, 0, 1)),
          periodEnd: new Date(Date.UTC(year, 11, 31)),
          entryType: 'RELEASE',
          amountMinutes: request.requestedMinutes,
          effectiveDate: request.startDate,
          reason: `Libération après refus de la demande ${request.id}`,
          idempotencyKey: `leave:${request.id}:release-rejected`,
          leaveRequestId: request.id,
          actorId: actor.id,
          allowNegativeBalance: true
        }, tx)
      }
      await tx.leaveRequest.update({
        where: { id: request.id },
        data: { status: 'REJECTED', rejectedAt: new Date(), privateDecisionNote: privateNote!.trim(), version: { increment: 1 } }
      })
    }

    await tx.leaveRequestHistory.create({
      data: {
        tenantId,
        leaveRequestId: request.id,
        action: decision,
        beforeSnapshot: before,
        afterSnapshot: { status: decision, approvedMinutes: decision === 'APPROVED' ? request.requestedMinutes : null },
        actorId: actor.id
      }
    })
    await createAuditEntry({
      userId: actor.id,
      action: decision === 'APPROVED' ? 'HR_LEAVE_REQUEST_APPROVED' : 'HR_LEAVE_REQUEST_REJECTED',
      category: 'HR_LEAVE',
      entityType: 'LeaveRequest',
      entityId: request.id,
      entityReference: `${request.employee.employeeNumber}:${request.startDate.toISOString().slice(0, 10)}`,
      metadata: { tenantId, employeeId: request.employeeId, decision, requestedMinutes: request.requestedMinutes }
    })
    await createNotification({
      recipientUserId: request.submittedById,
      type: 'LEAVE_DECISION',
      severity: decision === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      title: decision === 'APPROVED' ? 'Demande de congé approuvée' : 'Demande de congé refusée',
      message: `La demande de ${request.employee.displayName} a été ${decision === 'APPROVED' ? 'approuvée' : 'refusée'}.`,
      actionUrl: `/rh/conges/${request.id}`,
      deduplicationKey: `leave:${request.id}:${decision}:${request.submittedById}`
    })
    return { id: request.id, status: decision }
  })
}

export async function cancelLeaveRequest(tenantId: string, requestId: string, reason: string, actor: UserPublic) {
  if (reason.trim().length < 5) throw new Error('Un motif d’annulation est obligatoire.')
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${requestId}:leave-cancel`}))`
    const request = await tx.leaveRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { days: true, leaveType: true }
    })
    if (!request) throw new Error('Demande de congé introuvable.')
    if (!['PENDING_APPROVAL', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'CANCEL_REQUESTED'].includes(request.status)) throw new Error('Cette demande ne peut pas être annulée.')
    await ensureAttendanceIntervalMutable(tx, request)

    if (request.leaveType.usesBalance) {
      const year = request.startDate.getUTCFullYear()
      await recordLeaveBalanceEntry(tenantId, {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        periodStart: new Date(Date.UTC(year, 0, 1)),
        periodEnd: new Date(Date.UTC(year, 11, 31)),
        entryType: request.approvedAt ? 'REVERSAL' : 'RELEASE',
        amountMinutes: request.requestedMinutes,
        effectiveDate: request.startDate,
        reason: `Annulation demande ${request.id}: ${reason.trim()}`,
        idempotencyKey: `leave:${request.id}:cancel:${request.status}`,
        leaveRequestId: request.id,
        actorId: actor.id,
        allowNegativeBalance: true
      }, tx)
    }

    await tx.leaveApprovalStep.updateMany({ where: { leaveRequestId: request.id, status: 'PENDING' }, data: { status: 'CANCELLED' } })
    const updated = await tx.leaveRequest.update({
      where: { id: request.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledById: actor.id, privateDecisionNote: reason.trim(), version: { increment: 1 } }
    })
    await tx.leaveRequestHistory.create({
      data: { tenantId, leaveRequestId: request.id, action: 'CANCELLED', beforeSnapshot: { status: request.status }, afterSnapshot: { status: 'CANCELLED' }, actorId: actor.id }
    })

    for (const day of request.days) {
      if (!day.attendanceDayId) continue
      const attendance = await tx.attendanceDay.findUnique({ where: { id: day.attendanceDayId } })
      if (attendance?.status === 'ON_LEAVE') {
        await calculateAttendanceDay(tenantId, request.employeeId, day.localDate, tx)
      }
      await tx.absenceRecord.updateMany({
        where: { tenantId, leaveRequestId: request.id, localDate: day.localDate },
        data: { leaveRequestId: null, status: 'UNJUSTIFIED', source: 'ATTENDANCE_JOB' }
      })
    }
    await createAuditEntry({
      userId: actor.id,
      action: 'HR_LEAVE_REQUEST_CANCELLED',
      category: 'HR_LEAVE',
      entityType: 'LeaveRequest',
      entityId: request.id,
      entityReference: reason.trim(),
      metadata: { tenantId, previousStatus: request.status }
    })
    return { id: updated.id, status: updated.status }
  })
}

export async function reviewLeaveCancellation(tenantId: string, requestId: string, decision: 'APPROVED' | 'REJECTED', reason: string, actor: UserPublic) {
  if (reason.trim().length < 5) throw new Error('Un motif de décision est obligatoire.')
  const request = await prisma.leaveRequest.findFirst({ where: { id: requestId, tenantId } })
  if (!request) throw new Error('Demande de congé introuvable.')
  if (request.status !== 'CANCEL_REQUESTED') throw new Error('Aucune annulation n’est en attente pour cette demande.')
  if (request.submittedById === actor.id) throw new Error('Vous ne pouvez pas traiter votre propre demande d’annulation.')
  if (decision === 'APPROVED') return cancelLeaveRequest(tenantId, requestId, reason, actor)
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${requestId}:leave-cancel-review`}))`
    const updated = await tx.leaveRequest.updateMany({ where: { id: requestId, tenantId, status: 'CANCEL_REQUESTED', version: request.version }, data: { status: 'APPROVED', cancellationReason: null, cancellationRequestedAt: null, privateDecisionNote: reason.trim(), version: { increment: 1 } } })
    if (updated.count !== 1) throw new Error('La demande a déjà été traitée ou modifiée.')
    await tx.leaveRequestHistory.create({ data: { tenantId, leaveRequestId: requestId, action: 'CANCELLATION_REJECTED', beforeSnapshot: { status: 'CANCEL_REQUESTED' }, afterSnapshot: { status: 'APPROVED' }, actorId: actor.id } })
    return { id: requestId, status: 'APPROVED' }
  })
}
