import { describe, it, expect } from 'vitest'
import type { Role, QuoteStatus } from '@prisma/client'

function canArchiveOrRestore(role: Role): boolean {
  return ['SUPER_ADMIN', 'ACCOUNTANT'].includes(role)
}

function canPermanentlyDelete(role: Role, status: QuoteStatus): boolean {
  return role === 'SUPER_ADMIN' && status === 'DRAFT'
}

function isValidStatusTransition(current: QuoteStatus, next: QuoteStatus): boolean {
  const allowedMap: Record<QuoteStatus, QuoteStatus[]> = {
    DRAFT: ['SENT', 'ACCEPTED', 'REJECTED'],
    SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
    REJECTED: ['DRAFT'],
    ACCEPTED: [],
    EXPIRED: [],
    CONVERTED: []
  }
  return (allowedMap[current] || []).includes(next)
}

describe('Quote Permission Matrix & Status Workflow Tests', () => {
  describe('Permission Rules', () => {
    it('should allow SUPER_ADMIN and ACCOUNTANT to archive/restore, but forbid COMMERCIAL', () => {
      expect(canArchiveOrRestore('SUPER_ADMIN')).toBe(true)
      expect(canArchiveOrRestore('ACCOUNTANT')).toBe(true)
      expect(canArchiveOrRestore('COMMERCIAL')).toBe(false)
    })

    it('should allow only SUPER_ADMIN to delete DRAFT quotes', () => {
      expect(canPermanentlyDelete('SUPER_ADMIN', 'DRAFT')).toBe(true)
      expect(canPermanentlyDelete('ACCOUNTANT', 'DRAFT')).toBe(false)
      expect(canPermanentlyDelete('COMMERCIAL', 'DRAFT')).toBe(false)
      expect(canPermanentlyDelete('SUPER_ADMIN', 'SENT')).toBe(false)
    })
  })

  describe('Status Transition Rules', () => {
    it('should allow valid DRAFT transitions', () => {
      expect(isValidStatusTransition('DRAFT', 'SENT')).toBe(true)
      expect(isValidStatusTransition('DRAFT', 'ACCEPTED')).toBe(true)
      expect(isValidStatusTransition('DRAFT', 'REJECTED')).toBe(true)
    })

    it('should allow valid SENT transitions', () => {
      expect(isValidStatusTransition('SENT', 'ACCEPTED')).toBe(true)
      expect(isValidStatusTransition('SENT', 'REJECTED')).toBe(true)
      expect(isValidStatusTransition('SENT', 'EXPIRED')).toBe(true)
    })

    it('should allow reopening REJECTED quote to DRAFT', () => {
      expect(isValidStatusTransition('REJECTED', 'DRAFT')).toBe(true)
    })

    it('should forbid invalid or immutable transitions', () => {
      expect(isValidStatusTransition('ACCEPTED', 'DRAFT')).toBe(false)
      expect(isValidStatusTransition('EXPIRED', 'SENT')).toBe(false)
      expect(isValidStatusTransition('CONVERTED', 'DRAFT')).toBe(false)
    })
  })
})
