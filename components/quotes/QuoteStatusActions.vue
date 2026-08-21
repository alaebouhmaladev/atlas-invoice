<template>
  <div class="flex items-center gap-2 flex-wrap">
    <!-- Download PDF -->
    <button
      type="button"
      @click="$emit('download-pdf')"
      class="px-3.5 py-2 bg-panel-raised hover:bg-surface-hover text-main border border-custom rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
    >
      <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>Télécharger PDF</span>
    </button>

    <!-- Duplicate -->
    <button
      type="button"
      @click="$emit('duplicate')"
      :disabled="loading"
      class="px-3.5 py-2 bg-panel-raised hover:bg-surface-hover text-main border border-custom rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
    >
      <svg class="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <span>Dupliquer</span>
    </button>

    <!-- Status Transition Actions -->
    <template v-if="quote.status === 'DRAFT'">
      <button
        type="button"
        @click="$emit('change-status', 'SENT')"
        :disabled="loading"
        class="px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <span>Marquer comme envoyé</span>
      </button>

      <button
        type="button"
        @click="$emit('change-status', 'ACCEPTED')"
        :disabled="loading"
        class="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Accepter</span>
      </button>

      <button
        type="button"
        @click="$emit('change-status', 'REJECTED')"
        :disabled="loading"
        class="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>Refuser</span>
      </button>
    </template>

    <template v-else-if="quote.status === 'SENT'">
      <button
        type="button"
        @click="$emit('change-status', 'ACCEPTED')"
        :disabled="loading"
        class="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Accepter le devis</span>
      </button>

      <button
        type="button"
        @click="$emit('change-status', 'REJECTED')"
        :disabled="loading"
        class="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>Refuser le devis</span>
      </button>
    </template>

    <template v-else-if="quote.status === 'REJECTED'">
      <button
        type="button"
        @click="$emit('change-status', 'DRAFT')"
        :disabled="loading"
        class="px-3.5 py-2 bg-brand-soft hover:opacity-90 text-brand-strong border border-brand-soft rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Rouvrir comme brouillon</span>
      </button>
    </template>

    <!-- Convert to Facture Action (ACCEPTED devis) -->
    <button
      v-if="quote.status === 'ACCEPTED' && canConvertToInvoice"
      type="button"
      @click="$emit('convert-to-invoice')"
      :disabled="loading"
      class="px-3.5 py-2 bg-brand hover:opacity-90 text-slate-950 rounded-control text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <span>Convertir en facture</span>
    </button>

    <!-- Converted Indicator Link -->
    <div
      v-if="quote.status === 'CONVERTED'"
      class="px-3.5 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 rounded-control text-xs font-bold flex items-center gap-1.5"
    >
      <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span>Devis converti en facture</span>
    </div>

    <!-- Archive / Restore (SUPER_ADMIN & ACCOUNTANT) -->
    <button
      v-if="canArchiveRestore"
      type="button"
      @click="$emit('archive-restore')"
      :disabled="loading"
      class="px-3.5 py-2 bg-panel-raised hover:bg-surface-hover text-main border border-custom rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
    >
      <svg v-if="!quote.isArchived" class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8zm14 0l-4-4H9L5 8" />
      </svg>
      <svg v-else class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span>{{ quote.isArchived ? 'Restaurer' : 'Archiver' }}</span>
    </button>

    <!-- Delete (SUPER_ADMIN ONLY on DRAFT) -->
    <button
      v-if="canDelete && quote.status === 'DRAFT'"
      type="button"
      @click="$emit('delete')"
      :disabled="loading"
      class="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <span>Supprimer</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { QuoteWithRelations } from '~/composables/useQuotes'

defineProps<{
  quote: QuoteWithRelations
  loading?: boolean
  canArchiveRestore?: boolean
  canDelete?: boolean
  canConvertToInvoice?: boolean
}>()

defineEmits(['change-status', 'duplicate', 'archive-restore', 'delete', 'download-pdf', 'convert-to-invoice'])
</script>
