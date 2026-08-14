<template>
  <div class="inline-flex items-center gap-2">
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
      :class="statusClasses"
    >
      <span class="w-1.5 h-1.5 rounded-full" :class="dotClasses"></span>
      {{ label }}
    </span>

    <span
      v-if="isOverdue"
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse"
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
      return 'bg-slate-800/80 text-slate-400 border-slate-700'
    case 'PARTIALLY_PAID':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
    case 'PAID':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700'
  }
})

const dotClasses = computed(() => {
  switch (props.status) {
    case 'UNPAID':
      return 'bg-slate-500'
    case 'PARTIALLY_PAID':
      return 'bg-indigo-400'
    case 'PAID':
      return 'bg-emerald-400'
    default:
      return 'bg-slate-500'
  }
})
</script>
