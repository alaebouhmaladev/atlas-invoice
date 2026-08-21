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
      return { variant: 'success' as const, label: formatLabel(props.status) }

    case 'SENT':
    case 'ENVOYE':
    case 'PENDING':
    case 'EN_ATTENTE':
    case 'OPEN':
    case 'OUVERT':
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
    ACTIVE: 'Actif',
    ARCHIVED: 'Archivé',
    OPEN: 'En cours',
    RESOLVED: 'Résolu',
    UNRESOLVED: 'Non résolu'
  }
  return map[val.toUpperCase()] || val
}
</script>
