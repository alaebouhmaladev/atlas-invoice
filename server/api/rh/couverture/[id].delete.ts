import { defineEventHandler, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { deleteStaffingRequirement } from '../../../services/hrCoverage.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.coverage.manage')
  const id = event.context.params?.id as string

  try {
    await deleteStaffingRequirement(id, user)
    return { success: true }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || 'Erreur lors de la suppression de la règle de couverture.',
      data: { code: 'COVERAGE_DELETE_FAILED', message: err.message }
    })
  }
})
