import { defineEventHandler, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { createScheduledShift } from '../../../services/hrSchedule.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.shift.create')
  const body = await readBody(event)

  try {
    const shift = await createScheduledShift(body, user)
    return { success: true, data: shift }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de la création du shift.',
      data: err.data || { code: 'SHIFT_CREATE_FAILED', message: err.message }
    })
  }
})
