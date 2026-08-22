import { defineEventHandler, getQuery, setHeader } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { buildBankExport } from '~/server/services/hrPayrollExport.service'
export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.payroll.bank_export')
  const csv = await buildBankExport(String(getQuery(event).periodId || ''), actor)
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="preparation-virements-generique.csv"')
  setHeader(event, 'Cache-Control', 'private, no-store')
  return csv
})
