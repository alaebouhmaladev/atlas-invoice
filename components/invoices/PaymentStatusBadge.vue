<template>
  <div class="inline-flex items-center gap-2">
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-bold border transition-colors"
      :class="statusClasses"
    >
      <span class="w-1.5 h-1.5 rounded-full" :class="dotClasses"></span>
      {{ label }}
    </span>

    <span
      v-if="isOverdue"
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-extrabold bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40 animate-pulse"
      title="Facture en retard de paiement"
    >
      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      En retard
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | string
  isOverdue?: boolean
}>()

const label = computed(() => {
  switch (props.status) {
    case 'UNPAID':
      return 'Impayée'
    case 'PARTIALLY_PAID':
      return 'Partiellement payée'
    case 'PAID':
      return 'Payée'
    default:
      return props.status
  }
})

const statusClasses = computed(() => {
  switch (props.status) {
    case 'UNPAID':
      return 'bg-panel-raised text-muted-custom border-custom'
    case 'PARTIALLY_PAID':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
    case 'PAID':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    default:
      return 'bg-panel-raised text-muted-custom border-custom'
  }
})

const dotClasses = computed(() => {
  switch (props.status) {
    case 'UNPAID':
      return 'bg-slate-400 dark:bg-slate-500'
    case 'PARTIALLY_PAID':
      return 'bg-indigo-500'
    case 'PAID':
      return 'bg-emerald-500'
    default:
      return 'bg-slate-400 dark:bg-slate-500'
  }
})
</script>
