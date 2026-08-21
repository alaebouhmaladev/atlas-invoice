/**
 * Centralized French translation mappers & badge styling for HR Phase 2
 */

// --- Contract Status Mappers ---
export function formatContractStatus(status?: string | null): string {
  if (!status) return '-'
  const map: Record<string, string> = {
    DRAFT: 'Brouillon',
    ACTIVE: 'Actif',
    EXPIRED: 'Expiré',
    TERMINATED: 'Résilié',
    RENEWED: 'Renouvelé',
    CANCELLED: 'Annulé'
  }
  return map[status] || status
}

export function getContractStatusBadgeClass(status?: string | null): string {
  if (!status) return 'bg-slate-800 text-slate-300 border border-slate-700'
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-800/80 text-slate-400 border border-slate-700',
    ACTIVE: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    EXPIRED: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    TERMINATED: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    RENEWED: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    CANCELLED: 'bg-slate-800/80 text-slate-400 border border-slate-700'
  }
  return map[status] || 'bg-slate-800 text-slate-300 border border-slate-700'
}

// --- Contract Type Mappers ---
export function formatContractType(type?: string | null): string {
  if (!type) return '-'
  const map: Record<string, string> = {
    CDI: 'CDI',
    CDD: 'CDD',
    TEMPORARY: 'Contrat temporaire',
    INTERNSHIP: 'Stage',
    PART_TIME: 'Temps partiel',
    OTHER: 'Autre'
  }
  return map[type] || type
}

// --- Document Category Mappers ---
export function formatDocumentCategory(category?: string | null): string {
  if (!category) return '-'
  const map: Record<string, string> = {
    CIN: 'CIN',
    CONTRACT: 'Contrat de travail',
    CNSS: 'Document CNSS',
    RIB: 'Attestation RIB',
    MEDICAL: 'Certificat médical',
    DIPLOMA: 'Diplôme / Attestation',
    WORK_PERMIT: 'Autorisation de travail',
    WARNING: 'Avertissement',
    RESIGNATION: 'Démission',
    TERMINATION: 'Fin de contrat',
    OTHER: 'Autre'
  }
  return map[category] || category
}

export function getDocumentCategoryBadgeClass(category?: string | null): string {
  if (!category) return 'bg-slate-800 text-slate-300 border border-slate-700'
  const map: Record<string, string> = {
    CIN: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
    CONTRACT: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    CNSS: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    RIB: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    MEDICAL: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    DIPLOMA: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    WORK_PERMIT: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    WARNING: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
    RESIGNATION: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    TERMINATION: 'bg-red-500/20 text-red-300 border border-red-500/30',
    OTHER: 'bg-slate-800 text-slate-300 border border-slate-700'
  }
  return map[category] || 'bg-slate-800 text-slate-300 border border-slate-700'
}

// --- Site Type Mappers ---
export function formatWorkSiteType(type?: string | null): string {
  if (!type) return '-'
  const map: Record<string, string> = {
    HEAD_OFFICE: 'Siège administratif',
    RESTAURANT: 'Restaurant',
    CENTRAL_KITCHEN: 'Cuisine centrale',
    CATERING_SITE: 'Site de restauration',
    CLIENT_SITE: 'Site client',
    WAREHOUSE: 'Dépôt',
    OTHER: 'Autre'
  }
  return map[type] || type
}

// --- Date Formatter ---
export function formatHrDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

// --- Schedule Status Mappers ---
export function formatScheduleStatus(status?: string | null): string {
  if (!status) return '-'
  const map: Record<string, string> = {
    DRAFT: 'Brouillon',
    PUBLISHED: 'Publié',
    LOCKED: 'Verrouillé',
    ARCHIVED: 'Archivé'
  }
  return map[status] || status
}

export function getScheduleStatusBadgeClass(status?: string | null): string {
  if (!status) return 'bg-slate-800 text-slate-300 border border-slate-700'
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-800/80 text-amber-300 border border-amber-500/30',
    PUBLISHED: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    LOCKED: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    ARCHIVED: 'bg-slate-800/80 text-slate-400 border border-slate-700'
  }
  return map[status] || 'bg-slate-800 text-slate-300 border border-slate-700'
}

// --- Scheduled Shift Status Mappers ---
export function formatShiftStatus(status?: string | null): string {
  if (!status) return '-'
  const map: Record<string, string> = {
    PLANNED: 'Planifié',
    PUBLISHED: 'Publié',
    CHANGED: 'Modifié',
    CANCELLED: 'Annulé'
  }
  return map[status] || status
}

export function getShiftStatusBadgeClass(status?: string | null): string {
  if (!status) return 'bg-slate-800 text-slate-300 border border-slate-700'
  const map: Record<string, string> = {
    PLANNED: 'bg-slate-800/80 text-slate-300 border border-slate-700',
    PUBLISHED: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    CHANGED: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    CANCELLED: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
  }
  return map[status] || 'bg-slate-800 text-slate-300 border border-slate-700'
}

// --- Shift Segment Type Mappers ---
export function formatSegmentType(type?: string | null): string {
  if (!type) return '-'
  const map: Record<string, string> = {
    WORK: 'Travail',
    PAID_BREAK: 'Pause payée',
    UNPAID_BREAK: 'Pause non payée'
  }
  return map[type] || type
}

// --- Availability Status Mappers ---
export function formatAvailabilityStatus(status?: string | null): string {
  if (!status) return '-'
  const map: Record<string, string> = {
    AVAILABLE: 'Disponible',
    UNAVAILABLE: 'Indisponible',
    PREFERRED: 'Préféré'
  }
  return map[status] || status
}

// --- HR Audit Action Mappers ---
export function formatHrAuditAction(action?: string | null): string {
  if (!action) return '-'
  const map: Record<string, string> = {
    HR_SITE_CREATED: 'Site de travail créé',
    HR_SITE_UPDATED: 'Site de travail modifié',
    HR_SITE_ARCHIVED: 'Site de travail archivé',
    HR_SITE_RESTORED: 'Site de travail restauré',
    HR_DEPARTMENT_CREATED: 'Département créé',
    HR_DEPARTMENT_UPDATED: 'Département modifié',
    HR_POSITION_CREATED: 'Poste créé',
    HR_POSITION_UPDATED: 'Poste modifié',
    HR_POSITION_ARCHIVED: 'Poste archivé',
    HR_POSITION_RESTORED: 'Poste restauré',
    HR_EMPLOYEE_CREATED: 'Collaborateur créé',
    HR_EMPLOYEE_UPDATED: 'Collaborateur modifié',
    HR_EMPLOYEE_ARCHIVED: 'Collaborateur archivé',
    HR_EMPLOYEE_RESTORED: 'Collaborateur restauré',
    HR_CONTRACT_CREATED: 'Contrat de travail créé',
    HR_CONTRACT_UPDATED: 'Contrat de travail modifié',
    HR_CONTRACT_RENEWED: 'Contrat de travail renouvelé',
    HR_CONTRACT_TERMINATED: 'Contrat de travail résilié',
    HR_DOCUMENT_UPLOADED: 'Document RH versé',
    HR_DOCUMENT_DELETED: 'Document RH supprimé',
    HR_ATTENDANCE_EVENT: 'Pointage enregistré',
    HR_ATTENDANCE_CORRECTION: 'Demande de correction',
    HR_ATTENDANCE_ANOMALY_RESOLVED: 'Anomalie de pointage résolue'
  }
  if (map[action]) return map[action]
  
  // Safe fallback for unlisted actions: format SCREAMING_SNAKE_CASE to readable sentence
  const readable = action
    .replace(/^HR_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
  return readable.charAt(0).toUpperCase() + readable.slice(1)
}
