import { defineEventHandler, getRouterParam } from 'h3'
import { requireHrPermission } from '~/server/utils/hrPermissions'
import { prisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.attendance.read')
  const id = getRouterParam(event, 'id')
  if (!id) throw new Error('ID fiche de présence manquant')

  const day = await prisma.attendanceDay.findFirst({
    where: { id, tenantId: user.tenantId || 'default-tenant' },
    include: {
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          displayName: true,
          firstName: true,
          lastName: true,
          photoAssetId: true
        }
      },
      site: true,
      scheduledShift: {
        include: { segments: true }
      },
      anomalies: {
        include: { resolvedBy: { select: { id: true, name: true } } }
      },
      correctionRequests: {
        include: {
          requestedBy: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
          histories: true
        }
      },
      validation: {
        include: { validatorUser: { select: { id: true, name: true } } }
      }
    }
  })

  if (!day) {
    const err: any = new Error('Fiche de présence introuvable')
    err.statusCode = 404
    throw err
  }

  // Fetch raw clock events for this day
  const localDateStr = day.workDate.toISOString().split('T')[0]
  const rawEvents = await prisma.attendanceEvent.findMany({
    where: {
      tenantId: user.tenantId || 'default-tenant',
      employeeId: day.employeeId,
      localDate: localDateStr
    },
    include: {
      terminal: { select: { id: true, name: true, code: true } }
    },
    orderBy: { timestamp: 'asc' }
  })

  return {
    day,
    rawEvents
  }
})
