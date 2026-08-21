import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { requestCorrection } from '~/server/services/hrAttendanceCorrection.service'

const correctionRequestSchema = z.object({
  employeeId: z.string().min(1, 'L’employé est obligatoire'),
  siteId: z.string().min(1, 'Le site de travail est obligatoire'),
  workDate: z.string().min(1, 'La date de travail est obligatoire'),
  requestType: z.string().optional(),
  reason: z.string().min(5, 'Le motif de la correction est obligatoire (min 5 caractères)'),
  documentId: z.string().optional().nullable(),
  requestedClockIn: z.string().optional().nullable(),
  requestedClockOut: z.string().optional().nullable(),
  requestedBreakStart: z.string().optional().nullable(),
  requestedBreakEnd: z.string().optional().nullable(),
  requestedChanges: z.record(z.any()).optional().default({})
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.correct_request')
  const body = await readBody(event)
  const parsed = correctionRequestSchema.parse(body)

  return requestCorrection(user.tenantId || 'default-tenant', parsed, user)
})
