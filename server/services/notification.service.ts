import { Prisma, type NotificationSeverity, type Role } from '@prisma/client'
import { prisma } from '../utils/db'

export interface CreateNotificationOptions {
  recipientUserId?: string | null
  recipientRole?: Role | null
  type: string
  severity?: NotificationSeverity
  title: string
  message: string
  actionUrl?: string | null
  entityType?: string | null
  entityId?: string | null
  deduplicationKey?: string | null
  expiresAt?: Date | null
}

/**
 * Validates actionUrl to enforce internal application routing and prevent open-redirect vulnerabilities.
 */
function sanitizeActionUrl(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }
  return null
}

/**
 * Creates a persistent notification for a user or role.
 */
export async function createNotification(options: CreateNotificationOptions) {
  try {
    const actionUrl = sanitizeActionUrl(options.actionUrl)
    const severity = options.severity || 'INFO'

    // Deduplication check: skip if identical unread notification created recently
    if (options.deduplicationKey) {
      const existing = await prisma.appNotification.findFirst({
        where: {
          deduplicationKey: options.deduplicationKey,
          isRead: false,
          createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) } // 10 minutes window
        }
      })
      if (existing) {
        return existing
      }
    }

    return await prisma.appNotification.create({
      data: {
        recipientUserId: options.recipientUserId ?? null,
        recipientRole: options.recipientRole ?? null,
        type: options.type,
        severity,
        title: options.title,
        message: options.message,
        actionUrl,
        entityType: options.entityType ?? null,
        entityId: options.entityId ?? null,
        deduplicationKey: options.deduplicationKey ?? null,
        expiresAt: options.expiresAt ?? null
      }
    })
  } catch (error) {
    console.error('⚠️ Failed to create persistent notification:', error)
    return null
  }
}

export interface GetNotificationsParams {
  userId: string
  userRole: Role
  isRead?: boolean
  severity?: NotificationSeverity
  limit?: number
  page?: number
}

/**
 * Fetches notifications for a user based on their ID or Role.
 */
export async function getNotificationsForUser(params: GetNotificationsParams) {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(50, Math.max(1, params.limit || 15))
  const skip = (page - 1) * limit

  const where: Prisma.AppNotificationWhereInput = {
    OR: [
      { recipientUserId: params.userId },
      { recipientRole: params.userRole }
    ]
  }

  if (params.isRead !== undefined) {
    where.isRead = params.isRead
  }

  if (params.severity) {
    where.severity = params.severity
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.appNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.appNotification.count({ where }),
    prisma.appNotification.count({
      where: {
        OR: [
          { recipientUserId: params.userId },
          { recipientRole: params.userRole }
        ],
        isRead: false
      }
    })
  ])

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * Marks a single notification as read if owned by the user or their role.
 */
export async function markNotificationAsRead(id: string, userId: string, userRole: Role) {
  const notification = await prisma.appNotification.findUnique({
    where: { id }
  })

  if (!notification) {
    return null
  }

  // Tenant / User isolation verification
  const isRecipient = notification.recipientUserId === userId || notification.recipientRole === userRole
  if (!isRecipient) {
    return null
  }

  return await prisma.appNotification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date()
    }
  })
}

/**
 * Marks all notifications for a user or their role as read.
 */
export async function markAllNotificationsAsRead(userId: string, userRole: Role) {
  await prisma.appNotification.updateMany({
    where: {
      OR: [
        { recipientUserId: userId },
        { recipientRole: userRole }
      ],
      isRead: false
    },
    data: {
      isRead: true,
      readAt: new Date()
    }
  })

  return true
}
