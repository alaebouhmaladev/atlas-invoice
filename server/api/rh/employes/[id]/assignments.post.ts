import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createAssignment, transferEmployee } from '~/server/services/hrAssignment.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.assignment.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID employé requis' })
  const body = await readBody(event)

  let assignment
  if (body.isTransfer) {
    assignment = await transferEmployee({
      employeeId: id,
      effectiveDate: body.startDate,
      newSiteId: body.siteId,
      newDepartmentId: body.departmentId,
      newPositionId: body.positionId,
      newManagerEmployeeId: body.managerEmployeeId,
      assignmentType: body.assignmentType,
      reason: body.reason,
      notes: body.notes
    }, actor)
  } else {
    assignment = await createAssignment({
      ...body,
      employeeId: id
    }, actor)
  }

  return { success: true, data: assignment }
})
