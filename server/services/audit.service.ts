import { Prisma, type Role } from '@prisma/client'
import { prisma } from '../utils/db'
import type { H3Event } from 'h3'

export interface FieldDiff {
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface AuditLogOptions {
  userId?: string | null
  actorDisplayNameSnapshot?: string | null
  actorRoleSnapshot?: Role | null
  action: string
  category?: string // 'AUTH' | 'CLIENT' | 'DEVIS' | 'FACTURE' | 'PAYMENT' | 'SETTINGS' | 'SYSTEM' | 'USER'
  result?: 'SUCCESS' | 'FAILURE'
  entityType?: string | null
  entityId?: string | null
  entityReference?: string | null
  changedFields?: FieldDiff[] | null
  metadata?: Record<string, unknown> | null
  requestId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  event?: H3Event
}

/**
 * Sanitizes any dictionary object to prevent logging raw secrets.
 */

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value

  if (Array.isArray(value)) {
    return value.map(sanitizeValue)
  }

  const obj = value as Record<string, unknown>
  const sanitized: Record<string, unknown> = {}

  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase()
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('authorization') ||
      lowerKey.includes('cookie')
    ) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = sanitizeValue(obj[key])
    }
  }

  return sanitized
}

/**
 * Create an append-only audit log entry.
 */
export async function createAuditEntry(options: AuditLogOptions): Promise<void> {
  try {
    let ipAddress = options.ipAddress || null
    let userAgent = options.userAgent || null
    let requestId = options.requestId || null
    let userId = options.userId || null
    let actorName = options.actorDisplayNameSnapshot || null
    let actorRole = options.actorRoleSnapshot || null

    if (options.event) {
      ipAddress = ipAddress || (options.event.node.req.headers['x-forwarded-for'] as string) || options.event.node.req.socket?.remoteAddress || null
      userAgent = userAgent || (options.event.node.req.headers['user-agent'] as string) || null
      requestId = requestId || (options.event.context.requestId as string) || null

      if (!userId && options.event.context.user) {
        userId = options.event.context.user.id
        actorName = actorName || options.event.context.user.name
        actorRole = actorRole || options.event.context.user.role
      }
    }

    const safeMetadata = options.metadata ? (sanitizeValue(options.metadata) as Prisma.InputJsonValue) : undefined
    const safeDiffs = options.changedFields ? (sanitizeValue(options.changedFields) as Prisma.InputJsonValue) : undefined

    await prisma.auditLog.create({
      data: {
        userId,
        actorDisplayNameSnapshot: actorName,
        actorRoleSnapshot: actorRole,
        action: options.action,
        category: options.category || 'GENERAL',
        result: options.result || 'SUCCESS',
        entityType: options.entityType || null,
        entityId: options.entityId || null,
        entityReference: options.entityReference || null,
        changedFields: safeDiffs,
        metadata: safeMetadata,
        requestId,
        ipAddress,
        userAgent
      }
    })
  } catch (error) {
    console.error('⚠️ Failed to create audit log entry:', error)
  }
}

export interface AuditLogFilterParams {
  startDate?: string
  endDate?: string
  userId?: string
  role?: Role
  action?: string
  category?: string
  entityType?: string
  entityId?: string
  result?: string
  search?: string
  page?: number
  limit?: number
}

/**
 * Super Admin Audit Trail Exploration (Read-Only)
 */
export async function getAuditLogs(params: AuditLogFilterParams) {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 20))
  const skip = (page - 1) * limit

  const where: Prisma.AuditLogWhereInput = {}

  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) where.createdAt.gte = new Date(params.startDate)
    if (params.endDate) {
      const end = new Date(params.endDate)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  if (params.userId) where.userId = params.userId
  if (params.role) where.actorRoleSnapshot = params.role
  if (params.action) where.action = { contains: params.action, mode: 'insensitive' }
  if (params.category) where.category = params.category
  if (params.entityType) where.entityType = params.entityType
  if (params.entityId) where.entityId = params.entityId
  if (params.result) where.result = params.result

  if (params.search) {
    where.OR = [
      { action: { contains: params.search, mode: 'insensitive' } },
      { entityReference: { contains: params.search, mode: 'insensitive' } },
      { actorDisplayNameSnapshot: { contains: params.search, mode: 'insensitive' } },
      { requestId: { contains: params.search, mode: 'insensitive' } }
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    }),
    prisma.auditLog.count({ where })
  ])

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export const createAuditLog = createAuditEntry
