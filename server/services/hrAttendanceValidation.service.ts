import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import type { UserPublic } from '~/types/auth'

export async function validateTimesheetPeriod(
  tenantId: string,
  siteId: string,
  periodStart: Date,
  periodEnd: Date,
  user: UserPublic,
  notes?: string
) {
  // 1. Check for unresolved CRITICAL anomalies in this site & period
  const criticalAnomalies = await prisma.attendanceAnomaly.findMany({
    where: {
      tenantId,
      siteId,
      isResolved: false,
      severity: 'CRITICAL',
      createdAt: { gte: periodStart, lte: periodEnd }
    }
  })

  if (criticalAnomalies.length > 0) {
    const err: any = new Error(`Validation impossible : ${criticalAnomalies.length} anomalie(s) critique(s) non résolue(s) sur la période.`)
    err.statusCode = 400
    throw err
  }

  // 2. Fetch days to validate
  const days = await prisma.attendanceDay.findMany({
    where: {
      tenantId,
      siteId,
      workDate: { gte: periodStart, lte: periodEnd }
    }
  })

  const totalWorked = days.reduce((acc, d) => acc + d.netWorkedMinutes, 0)
  const totalPlanned = days.reduce((acc, d) => acc + d.plannedMinutes, 0)
  const totalOvertime = days.reduce((acc, d) => acc + d.overtimeMinutes, 0)
  const totalLate = days.reduce((acc, d) => acc + d.lateMinutes, 0)

  const summarySnapshot = {
    totalDaysCount: days.length,
    totalPlannedMinutes: totalPlanned,
    totalNetWorkedMinutes: totalWorked,
    totalOvertimeMinutes: totalOvertime,
    totalLateMinutes: totalLate,
    validatedAt: new Date().toISOString(),
    validatorName: user.name
  }

  return prisma.$transaction(async (tx) => {
    const validation = await tx.attendanceValidation.upsert({
      where: {
        tenantId_siteId_periodStart_periodEnd: { tenantId, siteId, periodStart, periodEnd }
      },
      update: {
        status: 'APPROVED',
        validatorUserId: user.id,
        validatedAt: new Date(),
        summarySnapshot,
        notes: notes || null
      },
      create: {
        tenantId,
        siteId,
        periodStart,
        periodEnd,
        status: 'APPROVED',
        validatorUserId: user.id,
        summarySnapshot,
        notes: notes || null
      }
    })

    // Update days to VALIDATED
    await tx.attendanceDay.updateMany({
      where: {
        tenantId,
        siteId,
        workDate: { gte: periodStart, lte: periodEnd }
      },
      data: {
        validationStatus: 'APPROVED',
        validationId: validation.id
      }
    })

    await createAuditEntry({
      userId: user.id,
      action: 'HR_ATTENDANCE_TIMESHEET_VALIDATED',
      category: 'HR_ATTENDANCE',
      result: 'SUCCESS',
      entityType: 'AttendanceValidation',
      entityId: validation.id,
      entityReference: `${periodStart.toISOString().split('T')[0]} -> ${periodEnd.toISOString().split('T')[0]}`,
      metadata: { siteId, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }
    })

    return validation
  })
}

export async function lockAttendancePeriod(
  tenantId: string,
  siteId: string,
  periodStart: Date,
  periodEnd: Date,
  lockConfirmationString: string,
  user: UserPublic
) {
  if (lockConfirmationString !== 'VERROUILLER POINTAGE') {
    const err: any = new Error('Chaîne de confirmation invalide. Saisissez exactement "VERROUILLER POINTAGE".')
    err.statusCode = 400
    throw err
  }

  return prisma.$transaction(async (tx) => {
    const lock = await tx.attendancePeriodLock.upsert({
      where: {
        tenantId_siteId_periodStart: { tenantId, siteId, periodStart }
      },
      update: {
        periodEnd,
        isLocked: true,
        lockedAt: new Date(),
        lockedById: user.id,
        lockConfirmationString,
        unlockedAt: null,
        unlockedById: null,
        unlockReason: null
      },
      create: {
        tenantId,
        siteId,
        periodStart,
        periodEnd,
        isLocked: true,
        lockedAt: new Date(),
        lockedById: user.id,
        lockConfirmationString
      }
    })

    await tx.attendanceDay.updateMany({
      where: {
        tenantId,
        siteId,
        workDate: { gte: periodStart, lte: periodEnd }
      },
      data: {
        validationStatus: 'LOCKED'
      }
    })

    await createAuditEntry({
      userId: user.id,
      action: 'HR_ATTENDANCE_PERIOD_LOCKED',
      category: 'HR_ATTENDANCE',
      result: 'SUCCESS',
      entityType: 'AttendancePeriodLock',
      entityId: lock.id,
      entityReference: `${periodStart.toISOString().split('T')[0]}`,
      metadata: { siteId, periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() }
    })

    return lock
  })
}

export async function unlockAttendancePeriod(
  tenantId: string,
  siteId: string,
  periodStart: Date,
  unlockReason: string,
  user: UserPublic
) {
  if (!unlockReason || unlockReason.trim().length < 5) {
    const err: any = new Error('Un motif d’expresse justification d’au moins 5 caractères est obligatoire pour déverrouiller une période.')
    err.statusCode = 400
    throw err
  }

  const lock = await prisma.attendancePeriodLock.findUnique({
    where: { tenantId_siteId_periodStart: { tenantId, siteId, periodStart } }
  })

  if (!lock || !lock.isLocked) {
    const err: any = new Error('Période non verrouillée ou introuvable.')
    err.statusCode = 404
    throw err
  }

  return prisma.$transaction(async (tx) => {
    const updatedLock = await tx.attendancePeriodLock.update({
      where: { id: lock.id },
      data: {
        isLocked: false,
        unlockedAt: new Date(),
        unlockedById: user.id,
        unlockReason
      }
    })

    const lockedDays = await tx.attendanceDay.findMany({
      where: { tenantId, siteId, workDate: { gte: periodStart, lte: lock.periodEnd } }
    })
    for (const day of lockedDays) {
      let restoredStatus = day.status
      if (day.status === 'LOCKED') {
        restoredStatus = day.firstClockIn
          ? (day.lastClockOut ? 'COMPLETE' : 'INCOMPLETE')
          : (day.plannedMinutes > 0 ? 'ABSENT' : 'REST_DAY')
      }
      await tx.attendanceDay.update({
        where: { id: day.id },
        data: { validationStatus: 'PENDING', status: restoredStatus }
      })
    }

    await createAuditEntry({
      userId: user.id,
      action: 'HR_ATTENDANCE_PERIOD_UNLOCKED',
      category: 'SECURITY',
      result: 'SUCCESS',
      entityType: 'AttendancePeriodLock',
      entityId: lock.id,
      entityReference: unlockReason,
      metadata: { siteId, unlockReason, unlockedById: user.id }
    })

    await createNotification({
      recipientRole: 'SUPER_ADMIN',
      type: 'SECURITY_ALERT',
      severity: 'WARNING',
      title: 'Déverrouillage exceptionnel de période RH',
      message: `La période RH du site ${siteId} a été déverrouillée par ${user.name}. Motif : ${unlockReason}`,
      actionUrl: '/rh/presences'
    })

    return updatedLock
  })
}
