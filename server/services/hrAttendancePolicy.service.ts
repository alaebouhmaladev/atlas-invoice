import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import type { UserPublic } from '~/types/auth'

export interface UpsertPolicyInput {
  siteId?: string | null
  name?: string
  timezone?: string
  earlyClockInToleranceMinutes?: number
  lateArrivalToleranceMinutes?: number
  earlyDepartureToleranceMinutes?: number
  maxAllowedBreakMinutes?: number
  maxDailyWorkMinutes?: number
  overtimeThresholdMinutes?: number
  minRestMinutes?: number
  allowUnscheduledClockIn?: boolean
  requireTerminal?: boolean
  requireManagerApproval?: boolean
  enableLocationVerification?: boolean
  autoClockOutPolicy?: string
  gracePeriodMinutes?: number
  paidBreakCountsAsCoverage?: boolean
}

export async function getAttendancePolicy(tenantId: string, siteId?: string | null) {
  if (siteId) {
    const sitePolicy = await prisma.attendancePolicy.findFirst({
      where: { tenantId, siteId }
    })
    if (sitePolicy) return sitePolicy
  }

  // Fallback to default tenant-wide policy (siteId = null)
  const defaultPolicy = await prisma.attendancePolicy.findFirst({
    where: { tenantId, siteId: null }
  })

  if (defaultPolicy) return defaultPolicy

  // Create default fallback policy if not exists
  return {
    id: 'default-fallback',
    tenantId,
    siteId: null,
    name: 'Politique de Pointage Par Défaut',
    timezone: 'Africa/Casablanca',
    earlyClockInToleranceMinutes: 15,
    lateArrivalToleranceMinutes: 10,
    earlyDepartureToleranceMinutes: 10,
    maxAllowedBreakMinutes: 60,
    maxDailyWorkMinutes: 600,
    overtimeThresholdMinutes: 480,
    minRestMinutes: 660,
    allowUnscheduledClockIn: true,
    requireTerminal: false,
    requireManagerApproval: true,
    enableLocationVerification: false,
    autoClockOutPolicy: 'NEVER',
    gracePeriodMinutes: 5,
    paidBreakCountsAsCoverage: false,
    createdById: 'system',
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1
  }
}

export async function upsertAttendancePolicy(
  tenantId: string,
  siteId: string | null,
  input: UpsertPolicyInput,
  user: UserPublic
) {
  const targetSiteId = siteId || null

  const existing = await prisma.attendancePolicy.findFirst({
    where: { tenantId, siteId: targetSiteId }
  })

  const data = {
    name: input.name || 'Politique de Pointage',
    timezone: input.timezone || 'Africa/Casablanca',
    earlyClockInToleranceMinutes: input.earlyClockInToleranceMinutes ?? 15,
    lateArrivalToleranceMinutes: input.lateArrivalToleranceMinutes ?? 10,
    earlyDepartureToleranceMinutes: input.earlyDepartureToleranceMinutes ?? 10,
    maxAllowedBreakMinutes: input.maxAllowedBreakMinutes ?? 60,
    maxDailyWorkMinutes: input.maxDailyWorkMinutes ?? 600,
    overtimeThresholdMinutes: input.overtimeThresholdMinutes ?? 480,
    minRestMinutes: input.minRestMinutes ?? 660,
    allowUnscheduledClockIn: input.allowUnscheduledClockIn ?? true,
    requireTerminal: input.requireTerminal ?? false,
    requireManagerApproval: input.requireManagerApproval ?? true,
    enableLocationVerification: input.enableLocationVerification ?? false,
    autoClockOutPolicy: input.autoClockOutPolicy || 'NEVER',
    gracePeriodMinutes: input.gracePeriodMinutes ?? 5,
    paidBreakCountsAsCoverage: input.paidBreakCountsAsCoverage ?? false,
    updatedById: user.id
  }

  let policy
  if (existing) {
    policy = await prisma.attendancePolicy.update({
      where: { id: existing.id },
      data: {
        ...data,
        version: { increment: 1 }
      }
    })
  } else {
    policy = await prisma.attendancePolicy.create({
      data: {
        tenantId,
        siteId: targetSiteId,
        ...data,
        createdById: user.id
      }
    })
  }

  await createAuditEntry({
    userId: user.id,
    action: 'HR_ATTENDANCE_POLICY_UPDATED',
    category: 'HR_ATTENDANCE',
    result: 'SUCCESS',
    entityType: 'AttendancePolicy',
    entityId: policy.id,
    entityReference: policy.name,
    metadata: { siteId: targetSiteId, policyId: policy.id }
  })

  return policy
}
