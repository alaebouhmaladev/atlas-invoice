import { describe, expect, it } from 'vitest'
import { calculateLeaveBalanceSnapshot } from '../server/services/hrLeaveBalance.service'
import { redactLeaveRequest } from '../server/services/hrLeaveRequest.service'

describe('HR Phase 5 — privacy and immutable balance calculations', () => {
  it('calculates available minutes from immutable ledger aggregate columns', () => {
    expect(calculateLeaveBalanceSnapshot({
      openingMinutes: 480,
      accruedMinutes: 960,
      adjustedMinutes: -60,
      reservedMinutes: 240,
      consumedMinutes: 480,
      expiredMinutes: 0
    })).toEqual({
      openingMinutes: 480,
      accruedMinutes: 960,
      adjustedMinutes: -60,
      reservedMinutes: 240,
      consumedMinutes: 480,
      expiredMinutes: 0,
      availableMinutes: 660
    })
  })

  it('removes private reasons, decisions, medical documents and approval notes', () => {
    const safe = redactLeaveRequest({
      id: 'request-1',
      privateReason: 'Information médicale privée',
      privateDecisionNote: 'Note RH privée',
      document: { id: 'medical-document' },
      approvalSteps: [{ id: 'step-1', status: 'PENDING', privateNote: 'Confidentiel' }]
    })
    expect(safe).toEqual({ id: 'request-1', approvalSteps: [{ id: 'step-1', status: 'PENDING' }] })
  })

  it('keeps private fields only for explicitly authorized readers', () => {
    const privateRequest = { id: 'request-1', privateReason: 'Privé', document: { id: 'doc-1' } }
    expect(redactLeaveRequest(privateRequest, true)).toBe(privateRequest)
  })
})
