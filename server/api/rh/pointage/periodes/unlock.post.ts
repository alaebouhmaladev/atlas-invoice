import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { unlockAttendancePeriod } from '~/server/services/hrAttendanceValidation.service'

const unlockSchema = z.object({
  siteId: z.string().min(1, 'Le site de travail est obligatoire'),
  periodStart: z.string().min(1, 'La date de début de période est obligatoire'),
  unlockReason: z.string().min(5, 'Le motif d’expresse justification est obligatoire')
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.unlock')
  const body = await readBody(event)
  const parsed = unlockSchema.parse(body)

  const startUtc = new Date(parsed.periodStart + 'T00:00:00.000Z')

  return unlockAttendancePeriod(
    user.tenantId || 'default-tenant',
    parsed.siteId,
    startUtc,
    parsed.unlockReason,
    user
  )
})
