import { defineEventHandler, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { deleteScheduledShift } from '../../../../services/hrSchedule.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.shift.cancel')
  const id = event.context.params?.id as string

  try {
    await deleteScheduledShift(id, user)
    return { success: true }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de l’annulation du shift.',
      data: { code: 'SHIFT_CANCEL_FAILED', message: err.message }
    })
  }
})
