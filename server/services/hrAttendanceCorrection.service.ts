import { CorrectionRequestStatus } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import { calculateAttendanceDay } from './hrAttendanceCalculation.service'
import type { UserPublic } from '~/types/auth'

export interface RequestCorrectionInput {
  employeeId: string
  siteId: string
  workDate: string | Date
  requestType?: string
  reason: string
  documentId?: string | null
  requestedClockIn?: string | Date | null
  requestedClockOut?: string | Date | null
  requestedBreakStart?: string | Date | null
  requestedBreakEnd?: string | Date | null
  requestedChanges: Record<string, any>
}

export async function requestCorrection(
  tenantId: string,
  input: RequestCorrectionInput,
  user: UserPublic
) {
  const workDateObj = new Date(new Date(input.workDate).toISOString().split('T')[0] + 'T00:00:00.000Z')

  // Find existing attendance day if present
  const day = await prisma.attendanceDay.findUnique({
    where: {
      tenantId_employeeId_workDate: {
        tenantId,
        employeeId: input.employeeId,
        workDate: workDateObj
      }
    }
  })

  // Check if period is locked
  const lock = await prisma.attendancePeriodLock.findFirst({
    where: {
      tenantId,
      siteId: input.siteId,
      periodStart: { lte: workDateObj },
      periodEnd: { gte: workDateObj },
      isLocked: true
    }
  })

  if (lock) {
    const err: any = new Error('Impossible de soumettre une demande de correction sur une période de pointage verrouillée.')
    err.statusCode = 400
    throw err
  }

  const beforeSnapshot = day ? JSON.parse(JSON.stringify(day)) : {}
  const proposedAfterSnapshot = {
    ...beforeSnapshot,
    requestedClockIn: input.requestedClockIn,
    requestedClockOut: input.requestedClockOut,
    requestedBreakStart: input.requestedBreakStart,
    requestedBreakEnd: input.requestedBreakEnd,
    requestedChanges: input.requestedChanges
  }

  const correction = await prisma.attendanceCorrectionRequest.create({
    data: {
      tenantId,
      employeeId: input.employeeId,
      siteId: input.siteId,
      attendanceDayId: day?.id || null,
      workDate: workDateObj,
      requestType: input.requestType || 'TIME_CORRECTION',
      status: 'PENDING',
      reason: input.reason,
      documentId: input.documentId || null,
      requestedClockIn: input.requestedClockIn ? new Date(input.requestedClockIn) : null,
      requestedClockOut: input.requestedClockOut ? new Date(input.requestedClockOut) : null,
      requestedBreakStart: input.requestedBreakStart ? new Date(input.requestedBreakStart) : null,
      requestedBreakEnd: input.requestedBreakEnd ? new Date(input.requestedBreakEnd) : null,
      requestedChanges: input.requestedChanges,
      beforeSnapshot,
      proposedAfterSnapshot,
      requestedById: user.id
    }
  })

  await createAuditEntry({
    userId: user.id,
    action: 'HR_ATTENDANCE_CORRECTION_REQUESTED',
    category: 'HR_ATTENDANCE',
    result: 'SUCCESS',
    entityType: 'AttendanceCorrectionRequest',
    entityId: correction.id,
    entityReference: input.reason,
    metadata: { employeeId: input.employeeId, workDate: workDateObj.toISOString() }
  })

  await createNotification({
    recipientRole: 'SUPER_ADMIN',
    type: 'ATTENDANCE_CORRECTION',
    severity: 'INFO',
    title: 'Nouvelle demande de correction de pointage',
    message: `Une correction de pointage a été soumise pour le ${workDateObj.toISOString().split('T')[0]}.`,
    actionUrl: '/rh/pointage/corrections'
  })

  return correction
}

export async function reviewCorrection(
  tenantId: string,
  correctionId: string,
  status: 'APPROVED' | 'REJECTED',
  reviewNote: string | undefined,
  user: UserPublic
) {
  const correction = await prisma.attendanceCorrectionRequest.findFirst({
    where: { id: correctionId, tenantId },
    include: { employee: true }
  })

  if (!correction) {
    const err: any = new Error('Demande de correction introuvable')
    err.statusCode = 444
    throw err
  }

  // Self-approval restriction: Requester can never approve or reject their own correction request
  if (correction.requestedById === user.id) {
    await createAuditEntry({
      userId: user.id,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      category: 'SECURITY',
      result: 'FAILURE',
      entityType: 'AttendanceCorrectionRequest',
      entityId: correction.id,
      entityReference: 'SELF_APPROVAL_ATTEMPT',
      metadata: { requestedById: correction.requestedById, reviewerUserId: user.id }
    })

    const err: any = new Error('Action non autorisée : Vous ne pouvez pas valider ou rejeter une demande de correction que vous avez personnellement soumise.')
    err.statusCode = 403
    throw err
  }

  return prisma.$transaction(async (tx) => {
    const updatedCorrection = await tx.attendanceCorrectionRequest.update({
      where: { id: correctionId },
      data: {
        status: status as CorrectionRequestStatus,
        reviewerId: user.id,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
        version: { increment: 1 }
      }
    })

    if (status === 'APPROVED') {
      const localDateStr = correction.workDate.toISOString().split('T')[0]

      // Create new raw events for approved manual correction without destroying original events
      if (correction.requestedClockIn) {
        await tx.attendanceEvent.create({
          data: {
            tenantId,
            employeeId: correction.employeeId,
            siteId: correction.siteId,
            eventType: 'CLOCK_IN',
            eventSource: 'ADMIN_CORRECTION',
            timestamp: new Date(correction.requestedClockIn),
            localDate: localDateStr,
            localTime: new Date(correction.requestedClockIn).toISOString().substring(11, 16),
            notes: `Correction approuvée par ${user.name}: ${reviewNote || correction.reason}`,
            createdById: user.id
          }
        })
      }

      if (correction.requestedClockOut) {
        await tx.attendanceEvent.create({
          data: {
            tenantId,
            employeeId: correction.employeeId,
            siteId: correction.siteId,
            eventType: 'CLOCK_OUT',
            eventSource: 'ADMIN_CORRECTION',
            timestamp: new Date(correction.requestedClockOut),
            localDate: localDateStr,
            localTime: new Date(correction.requestedClockOut).toISOString().substring(11, 16),
            notes: `Correction approuvée par ${user.name}: ${reviewNote || correction.reason}`,
            createdById: user.id
          }
        })
      }

      // Recalculate Attendance Day
      const recalculatedDay = await calculateAttendanceDay(
        tenantId,
        correction.employeeId,
        correction.workDate,
        tx
      )

      // Add Correction History
      await tx.attendanceCorrectionHistory.create({
        data: {
          tenantId,
          correctionRequestId: correction.id,
          attendanceDayId: recalculatedDay.id,
          action: 'APPROVED',
          beforeSnapshot: correction.beforeSnapshot as any,
          afterSnapshot: JSON.parse(JSON.stringify(recalculatedDay)),
          actorId: user.id
        }
      })
    } else {
      await tx.attendanceCorrectionHistory.create({
        data: {
          tenantId,
          correctionRequestId: correction.id,
          attendanceDayId: correction.attendanceDayId,
          action: 'REJECTED',
          beforeSnapshot: correction.beforeSnapshot as any,
          afterSnapshot: { status: 'REJECTED', reviewNote },
          actorId: user.id
        }
      })
    }

    await createAuditEntry({
      userId: user.id,
      action: status === 'APPROVED' ? 'HR_ATTENDANCE_CORRECTION_APPROVED' : 'HR_ATTENDANCE_CORRECTION_REJECTED',
      category: 'HR_ATTENDANCE',
      result: 'SUCCESS',
      entityType: 'AttendanceCorrectionRequest',
      entityId: correction.id,
      entityReference: status,
      metadata: { status, reviewerId: user.id, reviewNote }
    })

    return updatedCorrection
  })
}

export async function getCorrectionRequests(tenantId: string, siteId?: string, status?: CorrectionRequestStatus) {
  return prisma.attendanceCorrectionRequest.findMany({
    where: {
      tenantId,
      ...(siteId ? { siteId } : {}),
      ...(status ? { status } : {})
    },
    include: {
      employee: {
        select: { id: true, employeeNumber: true, displayName: true, firstName: true, lastName: true, linkedUserId: true }
      },
      site: { select: { id: true, code: true, name: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true } },
      document: true,
      histories: true
    },
    orderBy: { createdAt: 'desc' }
  })
}
