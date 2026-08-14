<template>
  <div
    v-if="selectedCount > 0"
    class="sticky top-4 z-40 my-3 p-3 bg-slate-900/95 border border-amber-500/30 rounded-2xl shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200"
  >
    <div class="flex items-center gap-3 min-w-0">
      <div class="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold shrink-0">
        {{ selectedCount }} sélectionné(s)
      </div>

      <!-- Select All Matching Filtered Banner (if page selected but total matching is greater) -->
      <div v-if="totalMatching && totalMatching > pageCount" class="text-xs text-slate-300">
        <span v-if="!isAllMatchingSelected">
          {{ pageCount }} documents de cette page sont sélectionnés.
          <button
            type="button"
            @click="selectAllMatching"
            class="text-amber-400 underline font-bold hover:text-amber-300 ml-1 cursor-pointer"
          >
            Sélectionner les {{ totalMatching }} documents correspondant aux filtres
          </button>
        </span>
        <span v-else class="text-amber-400 font-semibold">
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
        class="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
      >
        Restaurer
      </button>

      <template v-else>
        <button
          type="button"
          @click="$emit('archive')"
          class="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          Archiver
        </button>

        <button
          type="button"
          @click="$emit('delete')"
          class="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          Supprimer les brouillons
        </button>
      </template>

      <button
        type="button"
        @click="$emit('clear')"
        class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
