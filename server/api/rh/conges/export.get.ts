import { defineEventHandler, getQuery, setHeader } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { generateLeaveCsv, generateLeavePdf } from '~/server/services/hrLeaveExport.service'

const schema = z.object({ format: z.enum(['csv', 'pdf']).default('csv') })

export default defineEventHandler(async event => {
  const actor = await requireHrPermission(event, 'hr.leave.export')
  const { format } = schema.parse(getQuery(event))
  const tenantId = actor.tenantId || 'default-tenant'
  const content = format === 'pdf' ? await generateLeavePdf(tenantId) : await generateLeaveCsv(tenantId)
  setHeader(event, 'Content-Type', format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="conges-atlas.${format}"`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return content
})
