<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
    :class="statusClasses"
  >
    <span class="w-1.5 h-1.5 rounded-full" :class="dotClasses"></span>
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: 'DRAFT' | 'FINALIZED' | 'CANCELLED' | string
}>()

const label = computed(() => {
  switch (props.status) {
    case 'DRAFT':
      return 'Brouillon'
    case 'FINALIZED':
      return 'Finalisée'
    case 'CANCELLED':
      return 'Annulée'
    default:
      return props.status
  }
})

const statusClasses = computed(() => {
  switch (props.status) {
    case 'DRAFT':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'FINALIZED':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'CANCELLED':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700'
  }
})

const dotClasses = computed(() => {
  switch (props.status) {
    case 'DRAFT':
      return 'bg-amber-400'
    case 'FINALIZED':
      return 'bg-blue-400'
    case 'CANCELLED':
      return 'bg-rose-400'
    default:
      return 'bg-slate-500'
  }
})
</script>
