import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { assignEmployeeSalaryComponent } from '~/server/services/hrPayrollConfiguration.service'
const decimal = z.string().regex(/^\d+(\.\d{1,6})?$/)
const schema = z
  .object({
    employeeId: z.string().uuid(),
    componentDefinitionId: z.string().uuid(),
    sourceContractId: z.string().uuid().nullable().optional(),
    fixedAmount: decimal.nullable().optional(),
    percentage: decimal.nullable().optional(),
    calculationBase: z.string().max(80).nullable().optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    effectiveTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    reason: z.string().min(5).max(1000)
  })
  .strict()
export default defineEventHandler(async (event) =>
  assignEmployeeSalaryComponent(
    schema.parse(await readBody(event)),
    await requireHrPermission(event, 'hr.payroll.salary_component.manage')
  )
)
