import { Prisma } from '@prisma/client'
import { prisma } from '../utils/db'

export interface AuditLogOptions {
  userId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(options: AuditLogOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId ?? null,
        action: options.action,
        entityType: options.entityType ?? null,
        entityId: options.entityId ?? null,
        metadata: options.metadata ? (options.metadata as unknown as Prisma.InputJsonValue) : undefined,
        ipAddress: options.ipAddress ?? null,
        userAgent: options.userAgent ?? null
      }
    })
  } catch (error) {
    // Audit logging should fail gracefully without disrupting main business flows
    console.error('⚠️ Failed to create audit log entry:', error)
  }
}
