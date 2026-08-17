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
