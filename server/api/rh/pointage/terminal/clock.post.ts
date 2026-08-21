import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import * as argon2 from 'argon2'
import { prisma } from '~/server/utils/db'
import { authenticateTerminal } from '~/server/services/hrAttendanceTerminal.service'
import { registerClockEvent } from '~/server/services/hrAttendanceEvent.service'

const terminalClockSchema = z.object({
  tenantId: z.string().optional().default('default-tenant'),
  terminalCode: z.string().min(1, 'Le code de la borne est obligatoire'),
  terminalSecretOrPin: z.string().min(1, 'Le secret de la borne est obligatoire'),
  employeeNumberOrPin: z.string().min(1, 'Le matricule ou code PIN employé est obligatoire'),
  eventType: z.enum(['CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT']),
  idempotencyKey: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = terminalClockSchema.parse(body)

  const tenantId = parsed.tenantId || 'default-tenant'

  // 1. Authenticate Terminal
  const terminal = await authenticateTerminal(tenantId, parsed.terminalCode, parsed.terminalSecretOrPin)
  if (!terminal) {
    const err: any = new Error('Borne non autorisée ou identifiants de la borne invalides.')
    err.statusCode = 401
    throw err
  }

  // 2. Find Employee by employeeNumber OR verify attendancePinHash
  let employee = await prisma.employee.findFirst({
    where: {
      tenantId,
      employeeNumber: parsed.employeeNumberOrPin,
      employmentStatus: 'ACTIVE',
      archivedAt: null
    }
  })

  if (!employee) {
    // Check if input is employee PIN
    const activeEmployees = await prisma.employee.findMany({
      where: {
        tenantId,
        employmentStatus: 'ACTIVE',
        archivedAt: null,
        attendancePinHash: { not: null }
      }
    })

    for (const emp of activeEmployees) {
      if (emp.attendancePinHash) {
        try {
          const match = await argon2.verify(emp.attendancePinHash, parsed.employeeNumberOrPin)
          if (match) {
            employee = emp
            break
          }
        } catch {
          // Continue
        }
      }
    }
  }

  if (!employee) {
    const err: any = new Error('Employé introuvable ou code PIN invalide.')
    err.statusCode = 404
    throw err
  }

  // 3. Register Clock Event
  const result = await registerClockEvent(
    tenantId,
    employee.id,
    terminal.siteId,
    parsed.eventType,
    'SITE_TERMINAL',
    {
      terminalId: terminal.id,
      idempotencyKey: parsed.idempotencyKey || null,
      latitude: parsed.latitude || null,
      longitude: parsed.longitude || null
    }
  )

  return {
    success: true,
    employee: {
      id: employee.id,
      displayName: employee.displayName,
      employeeNumber: employee.employeeNumber
    },
    event: result.event,
    day: result.day,
    message: `Pointage (${parsed.eventType}) enregistré avec succès pour ${employee.displayName}.`
  }
})
