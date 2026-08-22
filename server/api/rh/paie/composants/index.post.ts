import { defineEventHandler, readBody } from 'h3'
import { z } from 'zod'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createSalaryComponent } from '~/server/services/hrPayrollConfiguration.service'
const schema = z
  .object({
    code: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/)
      .max(40),
    name: z.string().min(2).max(160),
    description: z.string().max(500).optional(),
    kind: z.enum(['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT']),
    mode: z.enum(['FIXED', 'VARIABLE', 'PERCENTAGE', 'QUANTITY_RATE']),
    taxable: z.boolean().optional(),
    cnssApplicable: z.boolean().optional(),
    amoApplicable: z.boolean().optional(),
    includedInGross: z.boolean().optional(),
    includedInNet: z.boolean().optional(),
    employeeSide: z.boolean().optional(),
    calculationOrder: z.number().int().min(1).max(999),
    debitAccount: z.string().max(80).optional(),
    creditAccount: z.string().max(80).optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })
  .strict()
export default defineEventHandler(async (event) =>
  createSalaryComponent(
    schema.parse(await readBody(event)),
    await requireHrPermission(event, 'hr.payroll.salary_component.manage')
  )
)
