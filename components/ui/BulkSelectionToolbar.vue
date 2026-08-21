<template>
  <div
    v-if="selectedCount > 0"
    class="sticky top-4 z-40 my-3 p-3 bg-panel/95 border border-brand-soft rounded-card shadow-soft backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200"
  >
    <div class="flex items-center gap-3 min-w-0">
      <div class="px-3 py-1 bg-brand-soft border border-brand-soft text-brand-strong rounded-pill text-xs font-bold shrink-0">
        {{ selectedCount }} sélectionné(s)
      </div>

      <!-- Select All Matching Filtered Banner (if page selected but total matching is greater) -->
      <div v-if="totalMatching && totalMatching > pageCount" class="text-xs text-secondary-custom">
        <span v-if="!isAllMatchingSelected">
          {{ pageCount }} documents de cette page sont sélectionnés.
          <button
            type="button"
            @click="selectAllMatching"
            class="text-brand-strong underline font-bold hover:text-brand ml-1 cursor-pointer"
          >
            Sélectionner les {{ totalMatching }} documents correspondant aux filtres
          </button>
        </span>
        <span v-else class="text-brand-strong font-bold">
          Tous les {{ totalMatching }} documents correspondant aux filtres sont sélectionnés.
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex items-center gap-2 shrink-0">
      <button
        v-if="isArchivedView"
        type="button"
        @click="$emit('restore')"
        class="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-control text-xs font-semibold transition-colors cursor-pointer"
      >
        Restaurer
      </button>

      <template v-else>
        <button
          type="button"
          @click="$emit('archive')"
          class="px-3 py-1.5 bg-brand-soft hover:opacity-90 text-brand-strong border border-brand-soft rounded-control text-xs font-bold transition-colors cursor-pointer"
        >
          Archiver
        </button>

        <button
          type="button"
          @click="$emit('delete')"
          class="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-control text-xs font-semibold transition-colors cursor-pointer"
        >
          Supprimer les brouillons
        </button>
      </template>

      <button
        type="button"
        @click="$emit('clear')"
        class="px-3 py-1.5 bg-panel-raised hover:bg-surface-hover text-main rounded-control text-xs font-semibold border border-custom transition-colors cursor-pointer"
      >
        Annuler la sélection
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  selectedCount: number
  pageCount: number
  totalMatching?: number
  isAllMatchingSelected?: boolean
  isArchivedView?: boolean
}>()

const emit = defineEmits<{
  (e: 'archive'): void
  (e: 'delete'): void
  (e: 'restore'): void
  (e: 'clear'): void
  (e: 'selectAllMatching'): void
}>()

const selectAllMatching = () => {
  emit('selectAllMatching')
}
</script>
