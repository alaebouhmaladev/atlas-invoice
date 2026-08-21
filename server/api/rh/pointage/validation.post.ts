import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { validateTimesheetPeriod } from '~/server/services/hrAttendanceValidation.service'

const validatePeriodSchema = z.object({
  siteId: z.string().min(1, 'Le site de travail est obligatoire'),
  periodStart: z.string().min(1, 'La date de début de période est obligatoire'),
  periodEnd: z.string().min(1, 'La date de fin de période est obligatoire'),
  notes: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.validate')
  const body = await readBody(event)
  const parsed = validatePeriodSchema.parse(body)

  const startUtc = new Date(parsed.periodStart + 'T00:00:00.000Z')
  const endUtc = new Date(parsed.periodEnd + 'T23:59:59.999Z')

  return validateTimesheetPeriod(
    user.tenantId || 'default-tenant',
    parsed.siteId,
    startUtc,
    endUtc,
    user,
    parsed.notes
  )
})
