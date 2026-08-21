import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createAttendanceTerminal } from '~/server/services/hrAttendanceTerminal.service'

const createTerminalSchema = z.object({
  siteId: z.string().min(1, 'Le site de travail est obligatoire'),
  name: z.string().min(2, 'Le nom de la borne est obligatoire'),
  code: z.string().min(2, 'Le code unique de la borne est obligatoire'),
  pin: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.terminal.manage')
  const body = await readBody(event)
  const parsed = createTerminalSchema.parse(body)

  return createAttendanceTerminal(
    user.tenantId || 'default-tenant',
    parsed.siteId,
    parsed.name,
    parsed.code,
    parsed.pin || null,
    user
  )
})
