import { defineEventHandler, getQuery } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.read')
  const tenantId = user.tenantId || 'default-tenant'
  const query = getQuery(event)
  const siteId = query.siteId ? String(query.siteId) : undefined

  const todayStr = new Date().toISOString().split('T')[0]
  const todayUtc = new Date(todayStr + 'T00:00:00.000Z')

  // Fetch today's attendance days
  const days = await prisma.attendanceDay.findMany({
    where: {
      tenantId,
      workDate: todayUtc,
      ...(siteId ? { siteId } : {})
    },
    include: {
      employee: {
        select: { id: true, employeeNumber: true, displayName: true, firstName: true, lastName: true, photoAssetId: true }
      },
      site: { select: { id: true, code: true, name: true } },
      anomalies: { where: { isResolved: false } }
    }
  })

  // Fetch today's raw events
  const events = await prisma.attendanceEvent.findMany({
    where: {
      tenantId,
      localDate: todayStr,
      ...(siteId ? { siteId } : {})
    },
    include: {
      employee: { select: { id: true, displayName: true, employeeNumber: true } }
    },
    orderBy: { timestamp: 'desc' }
  })

  // Map employee status
  const employeeLastEvents = new Map<string, any>()
  for (const ev of events) {
    if (!employeeLastEvents.has(ev.employeeId)) {
      employeeLastEvents.set(ev.employeeId, ev)
    }
  }

  const presentEmployees: any[] = []
  const breakEmployees: any[] = []

  for (const [empId, lastEv] of employeeLastEvents.entries()) {
    const empData = days.find(d => d.employeeId === empId)?.employee || lastEv.employee
    if (lastEv.eventType === 'CLOCK_IN' || lastEv.eventType === 'BREAK_END') {
      presentEmployees.push({ employee: empData, lastEvent: lastEv })
    } else if (lastEv.eventType === 'BREAK_START') {
      breakEmployees.push({ employee: empData, lastEvent: lastEv })
    }
  }

  const lateEmployees = days.filter(d => d.lateMinutes > 0)
  const plannedCount = days.filter(d => d.plannedMinutes > 0).length
  const actualCount = days.filter(d => d.netWorkedMinutes > 0 || d.status === 'OPEN').length

  const criticalAnomaliesCount = await prisma.attendanceAnomaly.count({
    where: {
      tenantId,
      isResolved: false,
      severity: 'CRITICAL',
      ...(siteId ? { siteId } : {})
    }
  })

  return {
    today: todayStr,
    presentCount: presentEmployees.length,
    breakCount: breakEmployees.length,
    lateCount: lateEmployees.length,
    plannedCount,
    actualCount,
    criticalAnomaliesCount,
    presentEmployees,
    breakEmployees,
    lateEmployees,
    days
  }
})
