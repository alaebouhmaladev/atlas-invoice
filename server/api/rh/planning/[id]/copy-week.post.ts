import { defineEventHandler, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { copyPreviousWeek } from '../../../../services/hrSchedule.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.schedule.create')
  const body = await readBody(event)

  if (!body?.siteId || !body?.sourcePeriodStart || !body?.targetPeriodStart) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { code: 'MISSING_PARAMS', message: 'Les paramètres siteId, sourcePeriodStart et targetPeriodStart sont obligatoires.' }
    })
  }

  try {
    const result = await copyPreviousWeek(
      body.siteId,
      body.sourcePeriodStart,
      body.targetPeriodStart,
      body.overwriteExisting ?? true,
      user
    )

    return { success: true, data: result }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de la copie du planning.',
      data: { code: 'SCHEDULE_COPY_FAILED', message: err.message }
    })
  }
})
