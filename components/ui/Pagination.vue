<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-custom text-xs">
    <!-- Results summary info -->
    <div class="text-muted-custom">
      Affichage de <span class="font-bold text-main font-mono">{{ startItem }}</span> à
      <span class="font-bold text-main font-mono">{{ endItem }}</span> sur
      <span class="font-bold text-main font-mono">{{ totalItems }}</span> résultats
    </div>

    <!-- Navigation Buttons -->
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        @click="$emit('change-page', page - 1)"
        :disabled="page <= 1"
        class="px-3 py-1.5 bg-panel-raised hover:bg-surface-hover text-main rounded-control border border-custom disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Précédent</span>
      </button>

      <!-- Page Indicator -->
      <span class="px-3 py-1.5 text-muted-custom font-medium">
        Page <strong class="text-main font-mono">{{ page }}</strong> sur <strong class="text-main font-mono">{{ totalPages }}</strong>
      </span>

      <button
        type="button"
        @click="$emit('change-page', page + 1)"
        :disabled="page >= totalPages"
        class="px-3 py-1.5 bg-panel-raised hover:bg-surface-hover text-main rounded-control border border-custom disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
      >
        <span>Suivant</span>
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}>()

defineEmits(['change-page'])

const startItem = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.page - 1) * props.pageSize + 1
})

const endItem = computed(() => {
  return Math.min(props.page * props.pageSize, props.totalItems)
})
</script>
