import { describe, it, expect } from 'vitest'
import type { Role } from '@prisma/client'

function canArchiveOrRestore(role: Role): boolean {
  return ['SUPER_ADMIN', 'ACCOUNTANT'].includes(role)
}

function canPermanentlyDelete(role: Role): boolean {
  return role === 'SUPER_ADMIN'
}

function canCreateOrUpdate(role: Role): boolean {
  return ['SUPER_ADMIN', 'ACCOUNTANT', 'COMMERCIAL'].includes(role)
}

function canViewOrSearch(role: Role): boolean {
  return ['SUPER_ADMIN', 'ACCOUNTANT', 'COMMERCIAL'].includes(role)
}

describe('Client Permission Matrix Tests', () => {
  describe('View & Search Permissions', () => {
    it('should allow SUPER_ADMIN, ACCOUNTANT, and COMMERCIAL to view/search clients', () => {
      expect(canViewOrSearch('SUPER_ADMIN')).toBe(true)
      expect(canViewOrSearch('ACCOUNTANT')).toBe(true)
      expect(canViewOrSearch('COMMERCIAL')).toBe(true)
    })
  })

  describe('Create & Update Permissions', () => {
    it('should allow SUPER_ADMIN, ACCOUNTANT, and COMMERCIAL to create and update clients', () => {
      expect(canCreateOrUpdate('SUPER_ADMIN')).toBe(true)
      expect(canCreateOrUpdate('ACCOUNTANT')).toBe(true)
      expect(canCreateOrUpdate('COMMERCIAL')).toBe(true)
    })
  })

  describe('Archive & Restore Permissions', () => {
    it('should allow SUPER_ADMIN and ACCOUNTANT to archive and restore clients', () => {
      expect(canArchiveOrRestore('SUPER_ADMIN')).toBe(true)
      expect(canArchiveOrRestore('ACCOUNTANT')).toBe(true)
    })

    it('should forbid COMMERCIAL from archiving or restoring clients', () => {
      expect(canArchiveOrRestore('COMMERCIAL')).toBe(false)
    })
  })

  describe('Permanent Delete Permissions', () => {
    it('should allow only SUPER_ADMIN to permanently delete clients', () => {
      expect(canPermanentlyDelete('SUPER_ADMIN')).toBe(true)
    })

    it('should forbid ACCOUNTANT and COMMERCIAL from permanently deleting clients', () => {
      expect(canPermanentlyDelete('ACCOUNTANT')).toBe(false)
      expect(canPermanentlyDelete('COMMERCIAL')).toBe(false)
    })
  })
})
