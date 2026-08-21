import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { lockAttendancePeriod } from '~/server/services/hrAttendanceValidation.service'

const lockSchema = z.object({
  siteId: z.string().min(1, 'Le site de travail est obligatoire'),
  periodStart: z.string().min(1, 'La date de début est obligatoire'),
  periodEnd: z.string().min(1, 'La date de fin est obligatoire'),
  lockConfirmationString: z.string().min(1, 'La chaîne de confirmation est obligatoire')
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.lock')
  const body = await readBody(event)
  const parsed = lockSchema.parse(body)

  const startUtc = new Date(parsed.periodStart + 'T00:00:00.000Z')
  const endUtc = new Date(parsed.periodEnd + 'T23:59:59.999Z')

  return lockAttendancePeriod(
    user.tenantId || 'default-tenant',
    parsed.siteId,
    startUtc,
    endUtc,
    parsed.lockConfirmationString,
    user
  )
})
