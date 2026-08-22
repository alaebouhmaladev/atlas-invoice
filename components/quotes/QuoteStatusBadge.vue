<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
    :class="statusBadgeClasses"
  >
    <span class="w-1.5 h-1.5 rounded-full" :class="dotClasses"></span>
    <span>{{ statusText }}</span>
  </span>
</template>

<script setup lang="ts">
import type { QuoteStatus } from '@prisma/client'

const props = defineProps<{
  status: QuoteStatus
}>()

const statusText = computed(() => {
  switch (props.status) {
    case 'DRAFT':
      return 'Brouillon'
    case 'SENT':
      return 'Envoyé'
    case 'ACCEPTED':
      return 'Accepté'
    case 'REJECTED':
      return 'Refusé'
    case 'EXPIRED':
      return 'Expiré'
    case 'CONVERTED':
      return 'Converti en facture'
    default:
      return props.status
  }
})

const statusBadgeClasses = computed(() => {
  switch (props.status) {
    case 'DRAFT':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'SENT':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'ACCEPTED':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'REJECTED':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'EXPIRED':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'CONVERTED':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    default:
      return 'bg-panel-raised text-muted-custom border-custom'
  }
})

const dotClasses = computed(() => {
  switch (props.status) {
    case 'DRAFT':
      return 'bg-amber-400'
    case 'SENT':
      return 'bg-blue-400'
    case 'ACCEPTED':
      return 'bg-emerald-400'
    case 'REJECTED':
      return 'bg-rose-400'
    case 'EXPIRED':
      return 'bg-purple-400'
    case 'CONVERTED':
      return 'bg-cyan-400'
    default:
      return 'bg-border-strong'
  }
})
</script>
