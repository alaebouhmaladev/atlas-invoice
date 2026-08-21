<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-bold border transition-colors"
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
      return 'bg-[#b49c80]/15 text-[#987d61] dark:text-[#d0baa0] border-[#b49c80]/30'
    case 'FINALIZED':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'CANCELLED':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    default:
      return 'bg-panel-raised text-muted-custom border-custom'
  }
})

const dotClasses = computed(() => {
  switch (props.status) {
    case 'DRAFT':
      return 'bg-[#b49c80]'
    case 'FINALIZED':
      return 'bg-blue-500'
    case 'CANCELLED':
      return 'bg-rose-500'
    default:
      return 'bg-slate-400 dark:bg-slate-500'
  }
})
</script>
