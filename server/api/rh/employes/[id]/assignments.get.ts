import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getEmployeeAssignments } from '~/server/services/hrAssignment.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.assignment.read')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID employé requis' })

  const assignments = await getEmployeeAssignments(id, actor)
  return { success: true, data: assignments }
})
