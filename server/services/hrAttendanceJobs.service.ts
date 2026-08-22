import { prisma } from '../utils/db'
import { calculateAttendanceDay } from './hrAttendanceCalculation.service'
import { detectAndRecordAnomalies } from './hrAttendanceAnomaly.service'
import { createNotification } from './notification.service'

export async function detectMissingClockOuts(tenantId: string) {
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const workDate = new Date(yesterdayStr + 'T00:00:00.000Z')

  const openDays = await prisma.attendanceDay.findMany({
    where: {
      tenantId,
      status: 'OPEN',
      workDate: { lte: workDate }
    }
  })

  const processed = []
  for (const day of openDays) {
    const updated = await prisma.attendanceDay.update({
      where: { id: day.id },
      data: { status: 'INCOMPLETE' }
    })
    await detectAndRecordAnomalies(tenantId, day.id)
    processed.push(updated)
  }

  return { job: 'detectMissingClockOuts', processedCount: processed.length }
}

export async function detectMissingClockIns(tenantId: string, targetDate?: Date) {
  const workDateObj = targetDate || new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
  const shifts = await prisma.scheduledShift.findMany({
    where: {
      tenantId,
      workDate: workDateObj,
      status: { in: ['PUBLISHED', 'CHANGED'] }
    }
  })

  let missingCount = 0
  for (const shift of shifts) {
    const day = await prisma.attendanceDay.findFirst({
      where: { tenantId, employeeId: shift.employeeId, workDate: workDateObj }
    })
    if (!day || (!day.firstClockIn && day.status !== 'REST_DAY' && day.status !== 'HOLIDAY' && day.status !== 'ON_LEAVE' && day.status !== 'LOCKED')) {
      missingCount++
    }
  }

  return { job: 'detectMissingClockIns', missingCount }
}

export async function monitorOpenSessions(tenantId: string) {
  const openDays = await prisma.attendanceDay.findMany({
    where: { tenantId, status: 'OPEN' },
    include: { employee: true, site: true }
  })

  return { job: 'monitorOpenSessions', activeOpenSessionsCount: openDays.length, openDays }
}

export async function detectAbsences(tenantId: string, targetDate?: Date) {
  const workDateObj = targetDate || new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')

  const scheduledShifts = await prisma.scheduledShift.findMany({
    where: {
      tenantId,
      workDate: workDateObj,
      status: { in: ['PUBLISHED', 'CHANGED'] }
    }
  })

  let createdAbsenceCount = 0
  for (const shift of scheduledShifts) {
    const lock = await prisma.attendancePeriodLock.findFirst({
      where: {
        tenantId,
        siteId: shift.siteId,
        isLocked: true,
        periodStart: { lte: workDateObj },
        periodEnd: { gte: workDateObj }
      }
    })
    if (lock) continue
    const day = await calculateAttendanceDay(tenantId, shift.employeeId, workDateObj)
    if (day.status === 'ABSENT') {
      await prisma.absenceRecord.upsert({
        where: { tenantId_employeeId_localDate: { tenantId, employeeId: shift.employeeId, localDate: workDateObj } },
        update: { siteId: shift.siteId, attendanceDayId: day.id, status: 'UNJUSTIFIED', source: 'ATTENDANCE_JOB' },
        create: {
          tenantId,
          employeeId: shift.employeeId,
          siteId: shift.siteId,
          localDate: workDateObj,
          attendanceDayId: day.id,
          status: 'UNJUSTIFIED',
          source: 'ATTENDANCE_JOB'
        }
      })
      createdAbsenceCount++
    }
  }

  return { job: 'detectAbsences', targetDate: workDateObj.toISOString().split('T')[0], createdAbsenceCount }
}

export async function recalculateDailyAttendance(tenantId: string, targetDate?: Date) {
  const workDateObj = targetDate || new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')

  const days = await prisma.attendanceDay.findMany({
    where: { tenantId, workDate: workDateObj }
  })

  let recalculatedCount = 0
  for (const day of days) {
    if (day.validationStatus === 'LOCKED' || day.status === 'LOCKED') continue
    await calculateAttendanceDay(tenantId, day.employeeId, workDateObj)
    recalculatedCount++
  }

  return { job: 'recalculateDailyAttendance', recalculatedCount }
}

export async function sendPendingValidationReminders(tenantId: string) {
  const pendingCorrections = await prisma.attendanceCorrectionRequest.count({
    where: { tenantId, status: 'PENDING' }
  })

  const pendingAnomalies = await prisma.attendanceAnomaly.count({
    where: { tenantId, isResolved: false, severity: 'CRITICAL' }
  })

  if (pendingCorrections > 0 || pendingAnomalies > 0) {
    await createNotification({
      recipientRole: 'HR_MANAGER',
      type: 'ATTENDANCE_CORRECTION',
      severity: 'WARNING',
      title: 'Rappel : Actions RH en attente',
      message: `Il y a ${pendingCorrections} demande(s) de correction et ${pendingAnomalies} anomalie(s) critique(s) à traiter.`,
      actionUrl: '/rh/pointage/anomalies'
    })
  }

  return { job: 'sendPendingValidationReminders', pendingCorrections, pendingAnomalies }
}

// Aliases for backwards compatibility
export const runMissingClockOutJob = detectMissingClockOuts
export const runAbsenceDetectionJob = detectAbsences
