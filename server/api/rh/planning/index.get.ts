import { defineEventHandler, getQuery, createError } from 'h3'
import { requireHrPermission } from '../../../utils/hrPermissions'
import { getOrCreateWorkSchedule, calculateStaffingCoverage } from '../../../services/hrSchedule.service'
import { prisma } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.schedule.read')
  const query = getQuery(event)
  const siteId = query.siteId as string
  const date = (query.date as string) || new Date().toISOString().slice(0, 10)

  if (!siteId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'MISSING_PARAM', message: 'Le paramètre siteId est obligatoire.' }
    })
  }

  try {
    const schedule = await getOrCreateWorkSchedule(siteId, date, user)
    const coverage = await calculateStaffingCoverage(siteId, date, user)
    const leaveDays = await prisma.leaveRequestDay.findMany({
      where: {
        tenantId: user.tenantId || 'default-tenant',
        siteId,
        localDate: { gte: schedule.periodStart, lte: schedule.periodEnd },
        leaveRequest: { status: 'APPROVED' }
      },
      select: {
        localDate: true,
        requestedMinutes: true,
        leaveRequest: {
          select: {
            employeeId: true,
            leaveType: { select: { name: true, color: true } }
          }
        }
      }
    })

    return {
      success: true,
      data: {
        schedule,
        coverage,
        leaveDays
      }
    }
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || 'Erreur lors du chargement du planning.',
      data: { code: 'SCHEDULE_LOAD_FAILED', message: err.message }
    })
  }
})
