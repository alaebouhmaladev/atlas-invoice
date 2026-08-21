import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { revokeAttendanceTerminal } from '~/server/services/hrAttendanceTerminal.service'

const revokeSchema = z.object({
  reason: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.terminal.manage')
  const terminalId = getRouterParam(event, 'id')
  if (!terminalId) throw new Error('ID borne manquant')

  const body = await readBody(event) || {}
  const parsed = revokeSchema.parse(body)

  return revokeAttendanceTerminal(user.tenantId || 'default-tenant', terminalId, user, parsed.reason)
})
