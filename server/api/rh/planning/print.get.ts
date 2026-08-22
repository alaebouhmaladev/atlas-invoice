import { defineEventHandler, getQuery, createError, setHeader } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { getPrintableSchedulePayload, generateSchedulePdfBuffer } from '../../../services/hrPrint.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.schedule.read')
  const query = getQuery(event)
  const siteId = query.siteId as string
  const date = (query.date as string) || new Date().toISOString().slice(0, 10)
  const format = query.format as string

  if (!siteId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'MISSING_PARAM', message: 'Le paramètre siteId est obligatoire.' }
    })
  }

  try {
    if (format === 'pdf') {
      const pdfBuffer = await generateSchedulePdfBuffer(siteId, date, user)
      setHeader(event, 'Content-Type', 'application/pdf')
      setHeader(event, 'Content-Disposition', `inline; filename="planning-${siteId}-${date}.pdf"`)
      return pdfBuffer
    }

    const payload = await getPrintableSchedulePayload(siteId, date, user)
    return { success: true, data: payload }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || 'Erreur lors du chargement de l’impression.',
      data: { code: 'PRINT_LOAD_FAILED', message: err.message }
    })
  }
})
