import { defineEventHandler, readBody } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { createEmployee, type CreateEmployeeInput } from '../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.create')
  const body = await readBody<CreateEmployeeInput>(event)

  const employee = await createEmployee(body, user)

  return {
    success: true,
    data: employee
  }
})
