<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      @keydown.esc="close"
    >
      <div
        class="w-full max-w-lg bg-panel border border-custom rounded-panel shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        <!-- Modal Header -->
        <div class="px-5 py-4 bg-panel-raised border-b border-custom flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-control bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div class="truncate">
              <h3 class="text-sm font-bold text-main truncate">
                Opération terminée
              </h3>
              <p class="text-xs text-muted-custom truncate">
                Résumé du traitement effectué sur {{ result?.totalSelected || 0 }} document(s)
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="close"
            class="p-1.5 bg-panel hover:bg-surface-hover text-muted-custom hover:text-main rounded-control transition-colors cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content Body -->
        <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto" v-if="result">
          <!-- Count Badges Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div class="p-3 bg-panel-raised border border-custom rounded-card">
              <div class="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">{{ result.totalDeleted }}</div>
              <div class="text-[10px] font-bold text-muted-custom">Supprimés</div>
            </div>

            <div class="p-3 bg-panel-raised border border-custom rounded-card">
              <div class="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{{ result.totalArchived }}</div>
              <div class="text-[10px] font-bold text-muted-custom">Archivés</div>
            </div>

            <div class="p-3 bg-panel-raised border border-custom rounded-card">
              <div class="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{{ result.totalRestored }}</div>
              <div class="text-[10px] font-bold text-muted-custom">Restaurés</div>
            </div>

            <div class="p-3 bg-panel-raised border border-custom rounded-card">
              <div class="text-lg font-black text-muted-custom font-mono">{{ result.totalBlocked }}</div>
              <div class="text-[10px] font-bold text-muted-custom">Ignorés</div>
            </div>
          </div>

          <!-- Processed Item Details List -->
          <div v-if="result.results && result.results.length > 0" class="space-y-2">
            <div class="text-xs font-bold text-main">Détails des documents :</div>
            <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <div
                v-for="item in result.results"
                :key="item.id"
                class="p-2.5 bg-panel-raised border border-custom rounded-control flex items-center justify-between text-xs gap-2"
              >
                <div class="font-mono text-main font-bold truncate">
                  {{ item.number || `ID: ${item.id.substring(0, 8)}` }}
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span
                    v-if="item.actionTaken === 'DELETED'"
                    class="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  >
                    Supprimé
                  </span>
                  <span
                    v-else-if="item.actionTaken === 'ARCHIVED'"
                    class="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  >
                    Archivé
                  </span>
                  <span
                    v-else-if="item.actionTaken === 'RESTORED'"
                    class="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  >
                    Restauré
                  </span>
                  <span
                    v-else
                    class="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-panel-raised text-muted-custom border border-custom"
                    :title="item.reason"
                  >
                    Ignoré ({{ item.reason || 'Non admissible' }})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3.5 bg-panel-raised border-t border-custom flex justify-end shrink-0">
          <button
            type="button"
            @click="close"
            class="px-5 py-2 bg-[#b49c80] hover:bg-[#987d61] text-slate-950 font-bold rounded-pill text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  result?: {
    totalSelected: number
    totalArchived: number
    totalDeleted: number
    totalRestored: number
    totalBlocked: number
    results: Array<{
      id: string
      number?: string | null
      actionTaken: 'ARCHIVED' | 'DELETED' | 'RESTORED' | 'BLOCKED'
      reason?: string
    }>
  } | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const close = () => {
  emit('close')
}
</script>
