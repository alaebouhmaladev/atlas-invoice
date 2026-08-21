import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { prisma } from '~/server/utils/db'
import { registerClockEvent } from '~/server/services/hrAttendanceEvent.service'

const clockActionSchema = z.object({
  employeeId: z.string().optional(),
  siteId: z.string().optional(),
  eventType: z.enum(['CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT']),
  idempotencyKey: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  notes: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.clock')
  const tenantId = user.tenantId || 'default-tenant'
  const body = await readBody(event)
  const parsed = clockActionSchema.parse(body)

  // Resolve target employee
  let targetEmployeeId = parsed.employeeId

  if (!targetEmployeeId) {
    const linkedEmp = await prisma.employee.findFirst({
      where: { tenantId, linkedUserId: user.id, archivedAt: null }
    })
    if (!linkedEmp) {
      const err: any = new Error('Aucune fiche employé liée à votre compte utilisateur.')
      err.statusCode = 404
      throw err
    }
    targetEmployeeId = linkedEmp.id
  } else if (targetEmployeeId) {
    // If specifying employeeId, check permission or self-link
    const linkedEmp = await prisma.employee.findFirst({
      where: { tenantId, linkedUserId: user.id }
    })
    if (linkedEmp && linkedEmp.id !== targetEmployeeId && user.role !== 'SUPER_ADMIN' && user.role !== 'HR_MANAGER') {
      const err: any = new Error('Vous ne pouvez pas pointer pour un autre employé.')
      err.statusCode = 403
      throw err
    }
  }

  // Resolve target siteId
  let targetSiteId = parsed.siteId
  if (!targetSiteId) {
    const assignment = await prisma.employeeAssignment.findFirst({
      where: { tenantId, employeeId: targetEmployeeId, isPrimary: true, endDate: null }
    })
    targetSiteId = assignment?.siteId
  }
  if (!targetSiteId) {
    const defaultSite = await prisma.workSite.findFirst({ where: { tenantId, isActive: true } })
    targetSiteId = defaultSite?.id
  }

  if (!targetSiteId) {
    const err: any = new Error('Aucun site de travail associé pour le pointage.')
    err.statusCode = 400
    throw err
  }

  const result = await registerClockEvent(
    tenantId,
    targetEmployeeId,
    targetSiteId,
    parsed.eventType,
    'EMPLOYEE_WEB',
    {
      idempotencyKey: parsed.idempotencyKey || null,
      latitude: parsed.latitude || null,
      longitude: parsed.longitude || null,
      notes: parsed.notes || null,
      createdById: user.id
    }
  )

  return {
    success: true,
    event: result.event,
    day: result.day,
    message: `Pointage (${parsed.eventType}) enregistré avec succès.`
  }
})
