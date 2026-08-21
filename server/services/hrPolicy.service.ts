import { prisma } from '../utils/db'
import { createAuditEntry } from './audit.service'
import type { UserPublic } from '~/types/auth'

export interface UpsertSiteSchedulePolicyInput {
  siteId: string
  timezone?: string
  weekStartsOn?: number
  defaultDailyTargetMinutes?: number
  defaultWeeklyTargetMinutes?: number
  minimumRestMinutes?: number
  maximumConsecutiveDays?: number
  maximumDailyMinutes?: number
  maximumWeeklyMinutes?: number
  maximumSplitGapMinutes?: number
  allowOvernightShifts?: boolean
}

export async function getSiteSchedulePolicy(siteId: string, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  let policy = await prisma.siteSchedulePolicy.findFirst({
    where: { tenantId, siteId }
  })

  if (!policy) {
    // Return default policy
    policy = await prisma.siteSchedulePolicy.create({
      data: {
        tenantId,
        siteId,
        timezone: 'Africa/Casablanca',
        weekStartsOn: 1, // Monday
        defaultDailyTargetMinutes: 480, // 8h
        defaultWeeklyTargetMinutes: 2640, // 44h
        minimumRestMinutes: 660, // 11h
        maximumConsecutiveDays: 6,
        maximumDailyMinutes: 600, // 10h
        maximumWeeklyMinutes: 2880, // 48h
        maximumSplitGapMinutes: 240, // 4h
        allowOvernightShifts: true
      }
    })
  }

  return policy
}

export async function upsertSiteSchedulePolicy(input: UpsertSiteSchedulePolicyInput, actor: UserPublic) {
  const tenantId = actor.tenantId || 'default-tenant'

  const site = await prisma.workSite.findFirst({
    where: { id: input.siteId, tenantId, archivedAt: null }
  })
  if (!site) {
    throw new Error('Site introuvable ou archivé.')
  }

  const policy = await prisma.siteSchedulePolicy.upsert({
    where: { siteId: input.siteId },
    update: {
      timezone: input.timezone || 'Africa/Casablanca',
      weekStartsOn: input.weekStartsOn ?? 1,
      defaultDailyTargetMinutes: input.defaultDailyTargetMinutes ?? 480,
      defaultWeeklyTargetMinutes: input.defaultWeeklyTargetMinutes ?? 2640,
      minimumRestMinutes: input.minimumRestMinutes ?? 660,
      maximumConsecutiveDays: input.maximumConsecutiveDays ?? 6,
      maximumDailyMinutes: input.maximumDailyMinutes ?? 600,
      maximumWeeklyMinutes: input.maximumWeeklyMinutes ?? 2880,
      maximumSplitGapMinutes: input.maximumSplitGapMinutes ?? 240,
      allowOvernightShifts: input.allowOvernightShifts ?? true,
      updatedById: actor.id
    },
    create: {
      tenantId,
      siteId: input.siteId,
      timezone: input.timezone || 'Africa/Casablanca',
      weekStartsOn: input.weekStartsOn ?? 1,
      defaultDailyTargetMinutes: input.defaultDailyTargetMinutes ?? 480,
      defaultWeeklyTargetMinutes: input.defaultWeeklyTargetMinutes ?? 2640,
      minimumRestMinutes: input.minimumRestMinutes ?? 660,
      maximumConsecutiveDays: input.maximumConsecutiveDays ?? 6,
      maximumDailyMinutes: input.maximumDailyMinutes ?? 600,
      maximumWeeklyMinutes: input.maximumWeeklyMinutes ?? 2880,
      maximumSplitGapMinutes: input.maximumSplitGapMinutes ?? 240,
      allowOvernightShifts: input.allowOvernightShifts ?? true,
      updatedById: actor.id
    }
  })

  await createAuditEntry({
    userId: actor.id,
    action: 'HR_SCHEDULE_POLICY_UPDATED',
    category: 'HR_SCHEDULE',
    result: 'SUCCESS',
    entityType: 'SiteSchedulePolicy',
    entityId: policy.id,
    entityReference: site.name,
    metadata: { siteId: input.siteId, policy }
  })

  return policy
}
