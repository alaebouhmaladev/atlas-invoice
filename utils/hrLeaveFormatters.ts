export function formatLeaveCategory(value?: string | null): string {
  const labels: Record<string, string> = {
    PAID: 'Congé payé',
    UNPAID: 'Congé non payé',
    SICK: 'Maladie',
    AUTHORIZED_OTHER: 'Autre absence autorisée'
  }
  return value ? labels[value] || 'Autre catégorie' : 'Non renseignée'
}

export function formatLeaveApprovalStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    APPROVED: 'Approuvée',
    REJECTED: 'Refusée',
    SKIPPED: 'Ignorée'
  }
  return value ? labels[value] || 'Statut non répertorié' : 'Non renseigné'
}

export function formatAbsenceSource(value?: string | null): string {
  const labels: Record<string, string> = {
    ATTENDANCE_JOB: 'Détection pointage',
    LEAVE_REQUEST: 'Demande approuvée',
    MANUAL: 'Saisie RH'
  }
  return value ? labels[value] || 'Source non répertoriée' : 'Non renseignée'
}

export function formatLeaveRequestStatus(value?: string | null): string {
  const labels: Record<string, string> = {
    DRAFT: 'Brouillon',
    SUBMITTED: 'Soumise',
    PENDING_APPROVAL: 'En attente de validation',
    PENDING_MANAGER: 'En attente du responsable',
    PENDING_HR: 'En attente des RH',
    APPROVED: 'Approuvée',
    REJECTED: 'Refusée',
    CANCEL_REQUESTED: 'Annulation demandée',
    WITHDRAWN: 'Retirée',
    CANCELLED: 'Annulée'
  }
  return value ? labels[value] || 'Statut non répertorié' : 'Non renseigné'
}
