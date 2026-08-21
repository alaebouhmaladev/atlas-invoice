import { describe, it, expect } from 'vitest'
import { formatHrAuditAction, formatContractStatus, formatWorkSiteType } from '../utils/hrFormatters'

describe('HR Formatters & Navigation Matching', () => {
  describe('formatHrAuditAction', () => {
    it('translates defined HR audit actions to French', () => {
      expect(formatHrAuditAction('HR_SITE_CREATED')).toBe('Site de travail créé')
      expect(formatHrAuditAction('HR_POSITION_RESTORED')).toBe('Poste restauré')
      expect(formatHrAuditAction('HR_CONTRACT_CREATED')).toBe('Contrat de travail créé')
      expect(formatHrAuditAction('HR_DOCUMENT_UPLOADED')).toBe('Document RH versé')
      expect(formatHrAuditAction('HR_ATTENDANCE_EVENT')).toBe('Pointage enregistré')
      expect(formatHrAuditAction('HR_ATTENDANCE_ANOMALY_RESOLVED')).toBe('Anomalie de pointage résolue')
    })

    it('provides safe fallback for unknown HR audit actions', () => {
      expect(formatHrAuditAction('HR_CUSTOM_EVENT_TRIGGERED')).toBe('Custom event triggered')
      expect(formatHrAuditAction(null)).toBe('-')
    })
  })

  describe('formatContractStatus', () => {
    it('translates contract statuses correctly', () => {
      expect(formatContractStatus('DRAFT')).toBe('Brouillon')
      expect(formatContractStatus('ACTIVE')).toBe('Actif')
      expect(formatContractStatus('TERMINATED')).toBe('Résilié')
    })
  })

  describe('formatWorkSiteType', () => {
    it('translates site types correctly', () => {
      expect(formatWorkSiteType('HEAD_OFFICE')).toBe('Siège administratif')
      expect(formatWorkSiteType('RESTAURANT')).toBe('Restaurant')
    })
  })

  describe('Sidebar Route Active Matching Logic', () => {
    function isItemActive(to: string, currentPath: string): boolean {
      if (to === '/rh/pointage') {
        return currentPath === '/rh/pointage'
      }
      if (to === '/rh') {
        return currentPath === '/rh'
      }
      return currentPath === to || currentPath.startsWith(to + '/')
    }

    it('prevents duplicate active highlights on sub-routes under /rh/pointage', () => {
      expect(isItemActive('/rh/pointage', '/rh/pointage')).toBe(true)
      expect(isItemActive('/rh/pointage', '/rh/pointage/anomalies')).toBe(false)
      expect(isItemActive('/rh/pointage', '/rh/pointage/corrections')).toBe(false)

      expect(isItemActive('/rh/pointage/anomalies', '/rh/pointage/anomalies')).toBe(true)
      expect(isItemActive('/rh/pointage/corrections', '/rh/pointage/corrections')).toBe(true)
    })

    it('enforces exact match on HR overview /rh', () => {
      expect(isItemActive('/rh', '/rh')).toBe(true)
      expect(isItemActive('/rh', '/rh/employes')).toBe(false)
      expect(isItemActive('/rh', '/rh/organisation')).toBe(false)
    })
  })
})
