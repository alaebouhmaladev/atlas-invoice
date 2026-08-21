import { defineEventHandler, readBody, getRouterParam } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { reviewCorrection } from '~/server/services/hrAttendanceCorrection.service'

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.correct_review')
  const correctionId = getRouterParam(event, 'id')
  if (!correctionId) throw new Error('ID correction manquant')

  const body = await readBody(event)
  const parsed = reviewSchema.parse(body)

  if (parsed.status === 'REJECTED' && (!parsed.reviewNote || parsed.reviewNote.trim().length === 0)) {
    const err: any = new Error('Un motif de rejet est obligatoire en cas de refus de la demande.')
    err.statusCode = 400
    throw err
  }

  return reviewCorrection(
    user.tenantId || 'default-tenant',
    correctionId,
    parsed.status,
    parsed.reviewNote,
    user
  )
})
