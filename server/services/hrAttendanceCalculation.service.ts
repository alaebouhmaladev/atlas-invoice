import { AttendanceDayStatus } from '@prisma/client'
import { prisma } from '../utils/db'
import { getAttendancePolicy } from './hrAttendancePolicy.service'
import { detectAndRecordAnomalies } from './hrAttendanceAnomaly.service'

export async function calculateAttendanceDay(
  tenantId: string,
  employeeId: string,
  workDate: Date,
  dbTransaction?: any
) {
  const db = dbTransaction || prisma

  const localDateStr = workDate.toISOString().split('T')[0]

  // 1. Fetch raw events for this date
  const events = await db.attendanceEvent.findMany({
    where: { tenantId, employeeId, localDate: localDateStr },
    orderBy: { timestamp: 'asc' }
  })

  // 2. Fetch scheduled shift if published
  const scheduledShift = await db.scheduledShift.findFirst({
    where: {
      tenantId,
      employeeId,
      workDate,
      status: { in: ['PUBLISHED', 'CHANGED'] }
    },
    include: {
      segments: true,
      site: true
    }
  })

  const primarySiteId = scheduledShift?.siteId || events[0]?.siteId || (await db.employeeAssignment.findFirst({
    where: { tenantId, employeeId, isPrimary: true, endDate: null }
  }))?.siteId || (await db.workSite.findFirst({ where: { tenantId, isActive: true } }))?.id

  if (!primarySiteId) {
    throw new Error('Aucun site de travail associé pour le calcul de pointage.')
  }

  // 3. Fetch policy
  const policy = await getAttendancePolicy(tenantId, primarySiteId)

  // 4. Calculate planned minutes
  let plannedMinutes = 0
  let scheduledStartUtc: Date | null = null
  let scheduledEndUtc: Date | null = null

  if (scheduledShift && scheduledShift.segments.length > 0) {
    const workSegments = scheduledShift.segments.filter((s: any) => s.segmentType === 'WORK')
    plannedMinutes = workSegments.reduce((acc: number, seg: any) => {
      const durationMs = new Date(seg.endUtc).getTime() - new Date(seg.startUtc).getTime()
      return acc + Math.round(durationMs / 60000)
    }, 0)

    scheduledStartUtc = new Date(scheduledShift.segments[0].startUtc)
    scheduledEndUtc = new Date(scheduledShift.segments[scheduledShift.segments.length - 1].endUtc)
  }

  // 5. Calculate presence & break minutes from events
  let firstClockIn: Date | null = null
  let lastClockOut: Date | null = null
  let actualPresenceMinutes = 0
  let breakMinutes = 0
  let currentClockInTime: Date | null = null
  let currentBreakStartTime: Date | null = null
  let isOpenSession = false

  for (const ev of events) {
    if (ev.eventType === 'CLOCK_IN') {
      if (!firstClockIn) firstClockIn = new Date(ev.timestamp)
      currentClockInTime = new Date(ev.timestamp)
      isOpenSession = true
    } else if (ev.eventType === 'BREAK_START') {
      currentBreakStartTime = new Date(ev.timestamp)
    } else if (ev.eventType === 'BREAK_END') {
      if (currentBreakStartTime) {
        const duration = Math.round((new Date(ev.timestamp).getTime() - currentBreakStartTime.getTime()) / 60000)
        breakMinutes += Math.max(0, duration)
        currentBreakStartTime = null
      }
    } else if (ev.eventType === 'CLOCK_OUT') {
      lastClockOut = new Date(ev.timestamp)
      if (currentClockInTime) {
        const duration = Math.round((new Date(ev.timestamp).getTime() - currentClockInTime.getTime()) / 60000)
        actualPresenceMinutes += Math.max(0, duration)
        currentClockInTime = null
      }
      isOpenSession = false
    }
  }

  // If session currently open without clock-out
  if (isOpenSession && currentClockInTime && !lastClockOut) {
    const duration = Math.round((new Date().getTime() - currentClockInTime.getTime()) / 60000)
    actualPresenceMinutes += Math.max(0, duration)
  }

  const paidBreakMinutes = policy.paidBreakCountsAsCoverage ? breakMinutes : 0
  const unpaidBreakMinutes = policy.paidBreakCountsAsCoverage ? 0 : breakMinutes
  const netWorkedMinutes = Math.max(0, actualPresenceMinutes - unpaidBreakMinutes)

  // 6. Calculate Late & Early Departure
  let lateMinutes = 0
  let earlyDepartureMinutes = 0

  if (scheduledStartUtc && firstClockIn) {
    const diffMs = firstClockIn.getTime() - scheduledStartUtc.getTime()
    const diffMin = Math.round(diffMs / 60000)
    if (diffMin > policy.lateArrivalToleranceMinutes) {
      lateMinutes = diffMin
    }
  }

  if (scheduledEndUtc && lastClockOut) {
    const diffMs = scheduledEndUtc.getTime() - lastClockOut.getTime()
    const diffMin = Math.round(diffMs / 60000)
    if (diffMin > policy.earlyDepartureToleranceMinutes) {
      earlyDepartureMinutes = diffMin
    }
  }

  // 7. Calculate Overtime & Missing
  let overtimeMinutes = 0
  if (netWorkedMinutes > policy.overtimeThresholdMinutes) {
    overtimeMinutes = netWorkedMinutes - policy.overtimeThresholdMinutes
  }

  const missingMinutes = plannedMinutes > netWorkedMinutes ? plannedMinutes - netWorkedMinutes : 0
  const differenceMinutes = netWorkedMinutes - plannedMinutes

  // 8. Determine Day Status
  let status: AttendanceDayStatus = 'OPEN'
  if (events.length === 0) {
    status = scheduledShift ? 'ABSENT' : 'REST_DAY'
  } else if (isOpenSession) {
    status = 'OPEN'
  } else if (lastClockOut) {
    status = 'COMPLETE'
  } else {
    status = 'INCOMPLETE'
  }

  // 9. Upsert AttendanceDay Record
  const day = await db.attendanceDay.upsert({
    where: {
      tenantId_employeeId_workDate: { tenantId, employeeId, workDate }
    },
    update: {
      siteId: primarySiteId,
      status,
      scheduledShiftId: scheduledShift?.id || null,
      plannedMinutes,
      actualPresenceMinutes,
      paidBreakMinutes,
      unpaidBreakMinutes,
      netWorkedMinutes,
      lateMinutes,
      earlyDepartureMinutes,
      overtimeMinutes,
      missingMinutes,
      differenceMinutes,
      firstClockIn,
      lastClockOut,
      policySnapshot: JSON.parse(JSON.stringify(policy)),
      scheduleSnapshot: scheduledShift ? JSON.parse(JSON.stringify(scheduledShift)) : null,
      version: { increment: 1 }
    },
    create: {
      tenantId,
      employeeId,
      siteId: primarySiteId,
      workDate,
      status,
      scheduledShiftId: scheduledShift?.id || null,
      plannedMinutes,
      actualPresenceMinutes,
      paidBreakMinutes,
      unpaidBreakMinutes,
      netWorkedMinutes,
      lateMinutes,
      earlyDepartureMinutes,
      overtimeMinutes,
      missingMinutes,
      differenceMinutes,
      firstClockIn,
      lastClockOut,
      policySnapshot: JSON.parse(JSON.stringify(policy)),
      scheduleSnapshot: scheduledShift ? JSON.parse(JSON.stringify(scheduledShift)) : null
    }
  })

  // 10. Run anomaly detection
  await detectAndRecordAnomalies(tenantId, day.id, db)

  return day
}
