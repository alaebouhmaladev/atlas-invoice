import { defineEventHandler, getRouterParam } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getPayrollPeriod } from '~/server/services/hrPayroll.service'
export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.payroll.read')
  const period = await getPayrollPeriod(String(getRouterParam(event, 'id')), actor)
  return {
    period: { id: period.id, number: period.periodNumber, name: period.name, status: period.status },
    records: period.records.map((record) => ({
      id: record.id,
      employeeNumber: record.employeeNumberSnapshot,
      employeeName: record.employeeNameSnapshot,
      site: record.siteSnapshot,
      department: record.departmentSnapshot,
      grossSalary: record.grossSalary,
      totalDeductions: record.totalDeductions,
      netPayable: record.netPayable,
      employerCost: record.employerCost,
      status: record.status
    }))
  }
})
