import { describe, expect, it } from 'vitest'
import { calculatePortionMinutes } from '../server/services/hrLeaveRequest.service'
import { prorateAnnualMinutes } from '../server/services/hrLeaveJobs.service'
import { generateLeavePdf, protectCsvCell } from '../server/services/hrLeaveExport.service'
import { formatLeaveRequestStatus } from '../utils/hrLeaveFormatters'

describe('HR Phase 5 — durcissement des workflows et exports', () => {
  it('calcule les journées, demi-journées et plages horaires en minutes entières', () => {
    expect(calculatePortionMinutes(480, 'FULL_DAY')).toBe(480)
    expect(calculatePortionMinutes(480, 'MORNING')).toBe(240)
    expect(calculatePortionMinutes(480, 'CUSTOM', 540, 630)).toBe(90)
    expect(() => calculatePortionMinutes(480, 'CUSTOM', 630, 540)).toThrow('invalide')
  })

  it('proratise l’ouverture annuelle selon le mois d’embauche', () => {
    expect(prorateAnnualMinutes(12_000, new Date('2026-01-01'), 2026)).toBe(12_000)
    expect(prorateAnnualMinutes(12_000, new Date('2026-07-01'), 2026)).toBe(6_000)
  })

  it('neutralise les formules CSV et traduit tous les nouveaux statuts', () => {
    expect(protectCsvCell('=1+1')).toBe('"\'=1+1"')
    expect(protectCsvCell('@commande')).toBe('"\'@commande"')
    expect(formatLeaveRequestStatus('PENDING_MANAGER')).toBe('En attente du responsable')
    expect(formatLeaveRequestStatus('CANCEL_REQUESTED')).toBe('Annulation demandée')
  })

  it('conserve un générateur PDF réel exporté par le service', () => {
    expect(typeof generateLeavePdf).toBe('function')
  })
})
