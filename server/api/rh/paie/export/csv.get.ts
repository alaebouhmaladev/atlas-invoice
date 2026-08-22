import { defineEventHandler, getQuery, setHeader } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { buildPayrollRegisterCsv } from '~/server/services/hrPayrollExport.service'
export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.payroll.export')
  const periodId = String(getQuery(event).periodId || '')
  const csv = await buildPayrollRegisterCsv(periodId, actor)
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="registre-paie.csv"')
  setHeader(event, 'Cache-Control', 'private, no-store')
  return csv
})
