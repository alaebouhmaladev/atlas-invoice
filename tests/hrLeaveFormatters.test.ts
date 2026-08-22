import { describe, expect, it } from 'vitest'
import {
  formatAbsenceSource,
  formatLeaveApprovalStatus,
  formatLeaveCategory
} from '../utils/hrLeaveFormatters'

describe('Libellés français congés et absences', () => {
  it('traduit les catégories et décisions connues', () => {
    expect(formatLeaveCategory('PAID')).toBe('Congé payé')
    expect(formatLeaveCategory('SICK')).toBe('Maladie')
    expect(formatLeaveApprovalStatus('PENDING')).toBe('En attente')
    expect(formatLeaveApprovalStatus('REJECTED')).toBe('Refusée')
  })

  it('ne restitue jamais un identifiant interne inconnu', () => {
    expect(formatLeaveCategory('CUSTOM_INTERNAL')).toBe('Autre catégorie')
    expect(formatLeaveApprovalStatus('CUSTOM_INTERNAL')).toBe('Statut non répertorié')
    expect(formatAbsenceSource('CUSTOM_INTERNAL')).toBe('Source non répertoriée')
  })
})
