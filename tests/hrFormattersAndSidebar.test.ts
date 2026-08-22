import { describe, it, expect } from 'vitest'
import { formatHrAuditAction, formatContractStatus, formatWorkSiteType } from '../utils/hrFormatters'
import { getActiveSidebarTarget } from '../utils/sidebarNavigation'

describe('HR Formatters & Navigation Matching', () => {
  describe('formatHrAuditAction', () => {
    it('translates defined HR audit actions to French', () => {
      expect(formatHrAuditAction('HR_SITE_CREATED')).toBe('Site de travail créé')
      expect(formatHrAuditAction('HR_POSITION_RESTORED')).toBe('Poste restauré')
      expect(formatHrAuditAction('HR_CONTRACT_CREATED')).toBe('Contrat de travail créé')
      expect(formatHrAuditAction('HR_DOCUMENT_UPLOADED')).toBe('Document RH versé')
      expect(formatHrAuditAction('HR_ATTENDANCE_EVENT')).toBe('Pointage enregistré')
      expect(formatHrAuditAction('HR_ATTENDANCE_ANOMALY_RESOLVED')).toBe('Anomalie de pointage résolue')
      expect(formatHrAuditAction('HR_LEAVE_REQUEST_APPROVED')).toBe('Demande de congé approuvée')
    })

    it('provides safe fallback for unknown HR audit actions', () => {
      expect(formatHrAuditAction('HR_CUSTOM_EVENT_TRIGGERED')).toBe('Événement RH non répertorié')
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
    it('prevents duplicate active highlights on sub-routes under /rh/pointage', () => {
      const targets = ['/rh', '/rh/pointage', '/rh/pointage/anomalies', '/rh/pointage/corrections']
      expect(getActiveSidebarTarget(targets, '/rh/pointage')).toBe('/rh/pointage')
      expect(getActiveSidebarTarget(targets, '/rh/pointage/anomalies')).toBe('/rh/pointage/anomalies')
      expect(getActiveSidebarTarget(targets, '/rh/pointage/corrections')).toBe('/rh/pointage/corrections')
    })

    it('enforces exact match on HR overview /rh', () => {
      const targets = ['/rh', '/rh/employes', '/rh/organisation']
      expect(getActiveSidebarTarget(targets, '/rh')).toBe('/rh')
      expect(getActiveSidebarTarget(targets, '/rh/employes')).toBe('/rh/employes')
      expect(getActiveSidebarTarget(targets, '/rh/organisation')).toBe('/rh/organisation')
    })

    it('selects exactly one leave, client, admin, and query-specific route', () => {
      expect(getActiveSidebarTarget(
        ['/rh', '/rh/conges', '/rh/conges/soldes', '/rh/conges/parametres'],
        '/rh/conges/soldes'
      )).toBe('/rh/conges/soldes')
      expect(getActiveSidebarTarget(['/clients', '/clients/new'], '/clients/new')).toBe('/clients/new')
      expect(getActiveSidebarTarget(['/parametres', '/parametres/entreprise'], '/parametres/entreprise')).toBe('/parametres/entreprise')
      expect(getActiveSidebarTarget(
        ['/factures', '/factures?tab=paiements'],
        '/factures',
        { tab: 'paiements' }
      )).toBe('/factures?tab=paiements')
    })
  })
})
