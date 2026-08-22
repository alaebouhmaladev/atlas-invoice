import { defineEventHandler, getRouterParam, setHeader } from 'h3'
import { hasHrPermission, requireHrPermission } from '~/server/utils/hrPermissions'
import { generatePayslipPdf } from '~/server/services/hrPayslip.service'
export default defineEventHandler(async (event) => {
  const full = hasHrPermission(event.context.user, 'hr.payroll.payslip.read')
  const actor = await requireHrPermission(event, full ? 'hr.payroll.payslip.read' : 'hr.payroll.payslip.read_own')
  const pdf = await generatePayslipPdf(String(getRouterParam(event, 'recordId')), actor, !full)
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="${pdf.filename}"`)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return pdf.buffer
})
