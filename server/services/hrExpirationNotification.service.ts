import { ContractStatus } from '@prisma/client'
import { prisma } from '../utils/db'
import { createNotification } from './notification.service'

/**
 * Check expiring contracts and documents and trigger deduplicated notifications
 */
export async function checkHrExpirations(tenantId: string = 'default-tenant') {
  const now = new Date()

  // Expiration thresholds in days
  const thresholds = [60, 30, 15, 7]
  let notificationsCreated = 0

  // 1. Check Contracts
  for (const days of thresholds) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)

    const expiringContracts = await prisma.employmentContract.findMany({
      where: {
        tenantId,
        status: ContractStatus.ACTIVE,
        endDate: {
          not: null,
          gte: now,
          lte: targetDate
        }
      },
      include: {
        employee: { select: { id: true, employeeNumber: true, displayName: true } }
      }
    })

    for (const contract of expiringContracts) {
      const dedupKey = `EXPIRATION_CONTRACT_${contract.id}_${days}DAYS`
      const severity = days <= 15 ? 'WARNING' : 'INFO'

      const existingNotif = await prisma.appNotification.findFirst({
        where: { deduplicationKey: dedupKey, isRead: false }
      })

      if (!existingNotif) {
        await createNotification({
          recipientRole: 'SUPER_ADMIN',
          type: 'HR_EXPIRATION',
          severity,
          title: 'Expiration de contrat imminente',
          message: `Le contrat ${contract.contractNumber} de l’employé ${contract.employee.displayName} (${contract.employee.employeeNumber}) expire dans environ ${days} jours.`,
          actionUrl: `/rh/contrats`,
          entityType: 'EmploymentContract',
          entityId: contract.id,
          deduplicationKey: dedupKey
        })
        notificationsCreated++
      }
    }
  }

  // 2. Check Documents
  for (const days of thresholds) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)

    const expiringDocuments = await prisma.employeeDocument.findMany({
      where: {
        tenantId,
        archivedAt: null,
        expirationDate: {
          not: null,
          gte: now,
          lte: targetDate
        }
      },
      include: {
        employee: { select: { id: true, employeeNumber: true, displayName: true } }
      }
    })

    for (const doc of expiringDocuments) {
      const dedupKey = `EXPIRATION_DOC_${doc.id}_${days}DAYS`
      const severity = days <= 15 ? 'WARNING' : 'INFO'

      const existingNotif = await prisma.appNotification.findFirst({
        where: { deduplicationKey: dedupKey, isRead: false }
      })

      if (!existingNotif) {
        await createNotification({
          recipientRole: 'SUPER_ADMIN',
          type: 'HR_EXPIRATION',
          severity,
          title: 'Expiration de document imminente',
          message: `Le document "${doc.title}" de l’employé ${doc.employee.displayName} (${doc.employee.employeeNumber}) expire dans environ ${days} jours.`,
          actionUrl: `/rh/documents`,
          entityType: 'EmployeeDocument',
          entityId: doc.id,
          deduplicationKey: dedupKey
        })
        notificationsCreated++
      }
    }
  }

  return { notificationsCreated }
}
