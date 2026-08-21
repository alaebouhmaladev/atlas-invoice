import { defineEventHandler, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { createStaffingRequirement } from '../../../services/hrCoverage.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.coverage.manage')
  const body = await readBody(event)

  try {
    const req = await createStaffingRequirement(body, user)
    return { success: true, data: req }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de la création de la règle de couverture.',
      data: { code: 'COVERAGE_CREATE_FAILED', message: err.message }
    })
  }
})
