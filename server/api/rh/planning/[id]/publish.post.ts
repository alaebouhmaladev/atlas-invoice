import { defineEventHandler, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { publishSchedule } from '../../../../services/hrSchedule.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.schedule.publish')
  const id = event.context.params?.id as string
  const body = await readBody(event)

  try {
    const published = await publishSchedule(id, body?.confirmation || '', user)
    return { success: true, data: published }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de la publication du planning.',
      data: { code: 'SCHEDULE_PUBLISH_FAILED', message: err.message }
    })
  }
})
