import { describe, it, expect } from 'vitest'
import { getDashboardStats } from '../server/services/dashboard.service'

describe('Dashboard Service Analytics Tests', () => {
  it('should return valid stats structure for default 30d period', async () => {
    const stats = await getDashboardStats({ period: '30d', userRole: 'SUPER_ADMIN' })

    expect(stats).toBeDefined()
    expect(stats.periodLabel).toBe('30 derniers jours')
    expect(stats.financials).toBeDefined()
    expect(typeof stats.financials.invoicedRevenueTtc).toBe('string')
    expect(typeof stats.financials.amountCollected).toBe('string')
    expect(typeof stats.financials.amountRemaining).toBe('string')
    expect(typeof stats.financials.quoteConversionRate).toBe('number')
  })

  it('should calculate date range boundaries correctly for today and this_month', async () => {
    const todayStats = await getDashboardStats({ period: 'today' })
    expect(todayStats.periodLabel).toBe('Aujourd’hui')

    const monthStats = await getDashboardStats({ period: 'this_month' })
    expect(monthStats.periodLabel).toBe('Ce mois-ci')
  })

  it('should include system health metrics only for SUPER_ADMIN role', async () => {
    const adminStats = await getDashboardStats({ period: '7d', userRole: 'SUPER_ADMIN' })
    expect(adminStats.systemHealth).toBeDefined()
    expect(adminStats.systemHealth?.appStatus).toBe('HEALTHY')

    const staffStats = await getDashboardStats({ period: '7d', userRole: 'COMMERCIAL' })
    expect(staffStats.systemHealth).toBeUndefined()
  })
})
