import { AttendanceAnomalySeverity, AttendanceAnomalyType } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { createNotification } from './notification.service'
import type { UserPublic } from '~/types/auth'

export async function detectAndRecordAnomalies(
  tenantId: string,
  attendanceDayId: string,
  dbTransaction?: any
) {
  const db = dbTransaction || prisma

  const day = await db.attendanceDay.findUnique({
    where: { id: attendanceDayId },
    include: {
      employee: true,
      site: true
    }
  })

  if (!day) return []

  const policy = (day.policySnapshot as any) || {}
  const dateStr = day.workDate.toISOString().split('T')[0]
  const anomaliesToCreate: Array<{
    type: AttendanceAnomalyType
    severity: AttendanceAnomalySeverity
    message: string
    dedupKey: string
  }> = []

  // 1. Late Arrival
  if (day.lateMinutes > 0) {
    anomaliesToCreate.push({
      type: 'LATE_ARRIVAL',
      severity: day.lateMinutes > 30 ? 'CRITICAL' : 'WARNING',
      message: `Retard constaté de ${day.lateMinutes} minutes le ${dateStr}.`,
      dedupKey: `${tenantId}:${day.employeeId}:${dateStr}:LATE_ARRIVAL`
    })
  }

  // 2. Early Departure
  if (day.earlyDepartureMinutes > 0) {
    anomaliesToCreate.push({
      type: 'EARLY_DEPARTURE',
      severity: day.earlyDepartureMinutes > 30 ? 'CRITICAL' : 'WARNING',
      message: `Départ anticipé de ${day.earlyDepartureMinutes} minutes le ${dateStr}.`,
      dedupKey: `${tenantId}:${day.employeeId}:${dateStr}:EARLY_DEPARTURE`
    })
  }

  // 3. Missing Clock-Out
  if (day.status === 'INCOMPLETE') {
    anomaliesToCreate.push({
      type: 'MISSING_CLOCK_OUT',
      severity: 'CRITICAL',
      message: `Pointage de sortie manquant pour la journée du ${dateStr}.`,
      dedupKey: `${tenantId}:${day.employeeId}:${dateStr}:MISSING_CLOCK_OUT`
    })
  }

  // 4. Unscheduled Attendance
  if ((day.netWorkedMinutes > 0 || day.status === 'OPEN') && day.plannedMinutes === 0) {
    anomaliesToCreate.push({
      type: 'UNSCHEDULED_ATTENDANCE',
      severity: 'INFO',
      message: `Pointage effectué sans planning publié le ${dateStr} (${day.netWorkedMinutes} min).`,
      dedupKey: `${tenantId}:${day.employeeId}:${dateStr}:UNSCHEDULED_ATTENDANCE`
    })
  }

  // 5. Excessive Break
  const maxBreak = policy.maxAllowedBreakMinutes || 60
  const totalBreak = day.paidBreakMinutes + day.unpaidBreakMinutes
  if (totalBreak > maxBreak) {
    anomaliesToCreate.push({
      type: 'EXCESSIVE_BREAK',
      severity: 'WARNING',
      message: `Durée de pause excessive (${totalBreak} min vs max ${maxBreak} min) le ${dateStr}.`,
      dedupKey: `${tenantId}:${day.employeeId}:${dateStr}:EXCESSIVE_BREAK`
    })
  }

  // 6. Overtime
  if (day.overtimeMinutes > 0) {
    anomaliesToCreate.push({
      type: 'OVERTIME',
      severity: 'INFO',
      message: `Heures supplémentaires enregistrées (${day.overtimeMinutes} min) le ${dateStr}.`,
      dedupKey: `${tenantId}:${day.employeeId}:${dateStr}:OVERTIME`
    })
  }

  // Upsert anomalies using deduplication keys
  const createdRecords = []
  for (const ano of anomaliesToCreate) {
    const record = await db.attendanceAnomaly.upsert({
      where: { tenantId_deduplicationKey: { tenantId, deduplicationKey: ano.dedupKey } },
      update: {
        severity: ano.severity,
        message: ano.message,
        attendanceDayId: day.id
      },
      create: {
        tenantId,
        employeeId: day.employeeId,
        siteId: day.siteId,
        attendanceDayId: day.id,
        anomalyType: ano.type,
        severity: ano.severity,
        message: ano.message,
        deduplicationKey: ano.dedupKey
      }
    })

    if (ano.severity === 'CRITICAL') {
      await createNotification({
        recipientRole: 'SUPER_ADMIN',
        type: 'ATTENDANCE_ANOMALY',
        severity: 'WARNING',
        title: `Anomalie RH Critique — ${day.employee.displayName}`,
        message: ano.message,
        actionUrl: `/rh/pointage/anomalies`,
        deduplicationKey: ano.dedupKey
      })
    }

    createdRecords.push(record)
  }

  return createdRecords
}

export async function resolveAnomaly(
  tenantId: string,
  anomalyId: string,
  note: string,
  user: UserPublic
) {
  const anomaly = await prisma.attendanceAnomaly.findFirst({
    where: { id: anomalyId, tenantId }
  })

  if (!anomaly) {
    const err: any = new Error('Anomalie de pointage introuvable')
    err.statusCode = 444
    throw err
  }

  const updated = await prisma.attendanceAnomaly.update({
    where: { id: anomalyId },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedById: user.id,
      resolutionNote: note
    }
  })

  await createAuditEntry({
    userId: user.id,
    action: 'HR_ATTENDANCE_ANOMALY_RESOLVED',
    category: 'HR_ATTENDANCE',
    result: 'SUCCESS',
    entityType: 'AttendanceAnomaly',
    entityId: anomaly.id,
    entityReference: anomaly.anomalyType,
    metadata: { anomalyId: anomaly.id, note }
  })

  return updated
}

export async function getAnomalies(
  tenantId: string,
  siteId?: string,
  isResolved?: boolean,
  severity?: AttendanceAnomalySeverity
) {
  return prisma.attendanceAnomaly.findMany({
    where: {
      tenantId,
      ...(siteId ? { siteId } : {}),
      ...(isResolved !== undefined ? { isResolved } : {}),
      ...(severity ? { severity } : {})
    },
    include: {
      employee: {
        select: { id: true, employeeNumber: true, displayName: true, firstName: true, lastName: true }
      },
      site: {
        select: { id: true, code: true, name: true }
      },
      resolvedBy: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}
