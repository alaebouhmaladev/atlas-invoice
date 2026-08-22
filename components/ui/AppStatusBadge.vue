<template>
  <AppBadge :variant="badgeConfig.variant" :dot="true">
    {{ badgeConfig.label }}
  </AppBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppBadge from './AppBadge.vue'

const props = defineProps<{
  status: string
}>()

const badgeConfig = computed(() => {
  const s = props.status?.toUpperCase() || ''

  switch (s) {
    // Invoice / Quote statuses
    case 'PAID':
    case 'PAYEE':
    case 'ACQUITTEE':
    case 'ACCEPTED':
    case 'ACCEPTE':
    case 'PUBLISHED':
    case 'PUBLIE':
    case 'APPROVED':
    case 'VALIDEE':
    case 'ACTIVE':
    case 'ACTIF':
    case 'RESOLVED':
    case 'RESOLU':
    case 'JUSTIFIED':
      return { variant: 'success' as const, label: formatLabel(props.status) }

    case 'SENT':
    case 'ENVOYE':
    case 'PENDING':
    case 'EN_ATTENTE':
    case 'OPEN':
    case 'OUVERT':
    case 'PENDING_APPROVAL':
    case 'PENDING_MANAGER':
    case 'PENDING_HR':
    case 'CANCEL_REQUESTED':
      return { variant: 'info' as const, label: formatLabel(props.status) }

    case 'DRAFT':
    case 'BROUILLON':
      return { variant: 'neutral' as const, label: formatLabel(props.status) }

    case 'EXPIRED':
    case 'EXPIRE':
    case 'OVERDUE':
    case 'EN_RETARD':
    case 'UNRESOLVED':
    case 'NON_RESOLU':
      return { variant: 'warning' as const, label: formatLabel(props.status) }

    case 'REJECTED':
    case 'REFUSE':
    case 'CANCELLED':
    case 'ANNULE':
    case 'ARCHIVED':
    case 'ARCHIVE':
    case 'SUSPENDED':
    case 'SUSPENDU':
    case 'TERMINATED':
    case 'TERMINE':
    case 'UNJUSTIFIED':
      return { variant: 'danger' as const, label: formatLabel(props.status) }

    default:
      return { variant: 'neutral' as const, label: formatLabel(props.status) }
  }
})

function formatLabel(val: string): string {
  if (!val) return 'Inconnu'
  const map: Record<string, string> = {
    PAID: 'Acquittée',
    SENT: 'Envoyée',
    DRAFT: 'Brouillon',
    EXPIRED: 'Expirée',
    REJECTED: 'Refusée',
    ACCEPTED: 'Accepté',
    CANCELLED: 'Annulée',
    PUBLISHED: 'Publié',
    PENDING: 'En attente',
    APPROVED: 'Approuvé',
    PENDING_APPROVAL: 'À valider',
    PENDING_MANAGER: 'Responsable requis',
    PENDING_HR: 'Validation RH requise',
    CANCEL_REQUESTED: 'Annulation demandée',
    WITHDRAWN: 'Retirée',
    JUSTIFIED: 'Justifiée',
    UNJUSTIFIED: 'Non justifiée',
    ACTIVE: 'Actif',
    ARCHIVED: 'Archivé',
    OPEN: 'En cours',
    RESOLVED: 'Résolu',
    UNRESOLVED: 'Non résolu'
  }
  return map[val.toUpperCase()] || val
}
</script>
