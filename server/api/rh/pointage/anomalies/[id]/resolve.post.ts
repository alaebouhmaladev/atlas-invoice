import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { resolveAnomaly } from '~/server/services/hrAttendanceAnomaly.service'

const resolveSchema = z.object({
  resolutionNote: z.string().min(3, 'Une note de résolution est obligatoire')
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.anomaly.resolve')
  const anomalyId = getRouterParam(event, 'id')
  if (!anomalyId) throw new Error('ID anomalie manquant')

  const body = await readBody(event)
  const parsed = resolveSchema.parse(body)

  return resolveAnomaly(user.tenantId || 'default-tenant', anomalyId, parsed.resolutionNote, user)
})
