import { defineEventHandler, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { changePublishedShift } from '../../../../services/hrSchedule.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.shift.update')
  const id = event.context.params?.id as string
  const body = await readBody(event)

  try {
    const updated = await changePublishedShift(id, body?.input || {}, body?.reason || '', user)
    return { success: true, data: updated }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de la modification du shift.',
      data: { code: 'SHIFT_CHANGE_FAILED', message: err.message }
    })
  }
})
