import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../server/utils/db'
import { createNotification, getNotificationsForUser, markNotificationAsRead, markAllNotificationsAsRead } from '../server/services/notification.service'

describe('Persistent Notification System Tests', () => {
  let testUserId: string

  beforeAll(async () => {
    const testUser = await prisma.user.create({
      data: {
        name: 'Notification Test User',
        email: `notif_${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
        role: 'SUPER_ADMIN'
      }
    })
    testUserId = testUser.id
  })

  afterAll(async () => {
    if (testUserId) {
      await prisma.appNotification.deleteMany({ where: { recipientUserId: testUserId } })
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
    }
  })

  it('should create persistent notification and respect deduplication', async () => {
    const dedupKey = `test_dedup_${Date.now()}`

    const notif1 = await createNotification({
      recipientUserId: testUserId,
      type: 'FACTURE_FINALIZED',
      severity: 'SUCCESS',
      title: 'Facture finalisée',
      message: 'La facture FAC-2026-0001 a été finalisée.',
      actionUrl: '/factures/123',
      deduplicationKey: dedupKey
    })

    expect(notif1).not.toBeNull()
    expect(notif1?.title).toBe('Facture finalisée')
    expect(notif1?.actionUrl).toBe('/factures/123')

    // Duplicate creation within window should return existing record
    const notif2 = await createNotification({
      recipientUserId: testUserId,
      type: 'FACTURE_FINALIZED',
      severity: 'SUCCESS',
      title: 'Facture finalisée',
      message: 'La facture FAC-2026-0001 a été finalisée.',
      actionUrl: '/factures/123',
      deduplicationKey: dedupKey
    })

    expect(notif2?.id).toBe(notif1?.id)
  })

  it('should sanitize actionUrl to prevent open-redirect vulnerabilities', async () => {
    const notifExternal = await createNotification({
      recipientUserId: testUserId,
      type: 'SECURITY_ALERT',
      severity: 'WARNING',
      title: 'Test Redirect',
      message: 'Test open redirect',
      actionUrl: 'https://malicious-external-site.com/phish'
    })

    expect(notifExternal?.actionUrl).toBeNull()
  })

  it('should list notifications and mark them as read', async () => {
    const res = await getNotificationsForUser({
      userId: testUserId,
      userRole: 'SUPER_ADMIN'
    })

    expect(res.notifications.length).toBeGreaterThan(0)
    expect(res.unreadCount).toBeGreaterThan(0)

    const notifId = res.notifications[0].id
    const updated = await markNotificationAsRead(notifId, testUserId, 'SUPER_ADMIN')
    expect(updated?.isRead).toBe(true)

    await markAllNotificationsAsRead(testUserId, 'SUPER_ADMIN')

    const resAfter = await getNotificationsForUser({
      userId: testUserId,
      userRole: 'SUPER_ADMIN'
    })
    expect(resAfter.unreadCount).toBe(0)
  })
})
