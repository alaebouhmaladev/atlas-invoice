import { AttendanceEventType, AttendanceEventSource } from '@prisma/client'
import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import { calculateAttendanceDay } from './hrAttendanceCalculation.service'

export interface RegisterClockEventOptions {
  terminalId?: string | null
  idempotencyKey?: string | null
  latitude?: number | null
  longitude?: number | null
  locationVerified?: boolean
  notes?: string | null
  createdById?: string | null
  customTimestamp?: Date | null
}

export async function registerClockEvent(
  tenantId: string,
  employeeId: string,
  siteId: string,
  eventType: AttendanceEventType,
  eventSource: AttendanceEventSource = 'EMPLOYEE_WEB',
  options: RegisterClockEventOptions = {}
) {
  // Execute within transaction with PostgreSQL transaction advisory lock on hashtext(tenantId:employeeId)
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId + ':' + employeeId}))`

    // 1. Idempotency Check
    if (options.idempotencyKey) {
      const existing = await tx.attendanceEvent.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: options.idempotencyKey } }
      })
      if (existing) {
        if (existing.eventType !== eventType || existing.employeeId !== employeeId || existing.siteId !== siteId) {
          const err: any = new Error("Clé d'idempotence déjà utilisée avec des paramètres différents.")
          err.statusCode = 400
          throw err
        }
        // Return existing event and associated day
        const day = await tx.attendanceDay.findFirst({
          where: { tenantId, employeeId, workDate: new Date(existing.localDate + 'T00:00:00.000Z') }
        })
        return { event: existing, day, isDuplicate: true }
      }
    }

    // 2. Fetch employee events for today / recent window to determine current state
    const timestamp = options.customTimestamp || new Date()

    // Format local date & time in Africa/Casablanca
    const localDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Casablanca',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(timestamp)

    const localTimeStr = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Casablanca',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(timestamp)

    // Fetch last active event for this employee
    const lastEvent = await tx.attendanceEvent.findFirst({
      where: { tenantId, employeeId },
      orderBy: { timestamp: 'desc' }
    })

    // 3. State Machine Validation
    if (eventType === 'CLOCK_IN') {
      if (lastEvent && (lastEvent.eventType === 'CLOCK_IN' || lastEvent.eventType === 'BREAK_START' || lastEvent.eventType === 'BREAK_END')) {
        const err: any = new Error('Vous êtes déjà pointé en entrée. Veuillez pointer en sortie avant de pointer à nouveau.')
        err.statusCode = 400
        throw err
      }
    } else if (eventType === 'BREAK_START') {
      if (!lastEvent || lastEvent.eventType === 'CLOCK_OUT') {
        const err: any = new Error('Impossible de démarrer une pause sans pointage d’entrée actif.')
        err.statusCode = 400
        throw err
      }
      if (lastEvent.eventType === 'BREAK_START') {
        const err: any = new Error('Une pause est déjà en cours.')
        err.statusCode = 400
        throw err
      }
    } else if (eventType === 'BREAK_END') {
      if (!lastEvent || lastEvent.eventType !== 'BREAK_START') {
        const err: any = new Error('Aucune pause en cours à terminer.')
        err.statusCode = 400
        throw err
      }
    } else if (eventType === 'CLOCK_OUT') {
      if (!lastEvent || lastEvent.eventType === 'CLOCK_OUT') {
        const err: any = new Error('Aucune session de pointage active à fermer.')
        err.statusCode = 400
        throw err
      }
    }

    // 4. Create raw clock event
    const event = await tx.attendanceEvent.create({
      data: {
        tenantId,
        employeeId,
        siteId,
        terminalId: options.terminalId || null,
        eventType,
        eventSource,
        timestamp,
        localDate: localDateStr,
        localTime: localTimeStr,
        idempotencyKey: options.idempotencyKey || null,
        latitude: options.latitude || null,
        longitude: options.longitude || null,
        locationVerified: options.locationVerified || false,
        notes: options.notes || null,
        createdById: options.createdById || null
      }
    })

    // Audit action
    let auditAction = 'HR_ATTENDANCE_CLOCKED_IN'
    if (eventType === 'BREAK_START') auditAction = 'HR_ATTENDANCE_BREAK_STARTED'
    if (eventType === 'BREAK_END') auditAction = 'HR_ATTENDANCE_BREAK_ENDED'
    if (eventType === 'CLOCK_OUT') auditAction = 'HR_ATTENDANCE_CLOCKED_OUT'

    await createAuditEntry({
      userId: options.createdById || undefined,
      action: auditAction,
      category: 'HR_ATTENDANCE',
      result: 'SUCCESS',
      entityType: 'AttendanceEvent',
      entityId: event.id,
      entityReference: `${eventType} - ${localDateStr} ${localTimeStr}`,
      metadata: { employeeId, siteId, eventType, timestamp: timestamp.toISOString() }
    })

    // 5. Trigger attendance day calculation
    const workDate = new Date(localDateStr + 'T00:00:00.000Z')
    const day = await calculateAttendanceDay(tenantId, employeeId, workDate, tx)

    return { event, day, isDuplicate: false }
  })
}
