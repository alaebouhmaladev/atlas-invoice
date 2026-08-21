<template>
  <div class="flex items-center gap-2 flex-wrap">
    <!-- Download PDF -->
    <a
      :href="`/api/invoices/${invoice.id}/pdf`"
      target="_blank"
      class="px-3.5 py-2 bg-panel-raised hover:bg-surface-hover text-main border border-custom rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
    >
      <svg class="w-4 h-4 text-[#987d61] dark:text-[#d0baa0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>Télécharger PDF</span>
    </a>

    <!-- Finalize Invoice Action (DRAFT -> FINALIZED) -->
    <button
      v-if="invoice.status === 'DRAFT'"
      type="button"
      @click="$emit('finalize')"
      :disabled="loading"
      class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-control text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Finaliser la facture (Attribuer N° N-FAC)</span>
    </button>

    <!-- Register Payment Action (FINALIZED & UNPAID or PARTIALLY_PAID) -->
    <button
      v-if="invoice.status === 'FINALIZED' && invoice.paymentStatus !== 'PAID'"
      type="button"
      @click="$emit('open-payment-modal')"
      :disabled="loading"
      class="px-3.5 py-2 bg-brand text-on-brand hover:bg-brand-strong font-bold rounded-control text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      <span>Enregistrer un paiement</span>
    </button>

    <!-- Cancel Invoice Action (FINALIZED & SUPER_ADMIN) -->
    <button
      v-if="invoice.status === 'FINALIZED' && isSuperAdmin"
      type="button"
      @click="$emit('open-cancel-modal')"
      :disabled="loading"
      class="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Annuler la facture</span>
    </button>

    <!-- Edit Action (DRAFT) -->
    <NuxtLink
      v-if="invoice.status === 'DRAFT'"
      :to="`/factures/${invoice.id}/edit`"
      class="px-3.5 py-2 bg-panel-raised hover:bg-surface-hover text-main border border-custom rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
    >
      <svg class="w-4 h-4 text-[#987d61] dark:text-[#d0baa0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      <span>Éditer</span>
    </NuxtLink>

    <!-- Archive / Restore Actions -->
    <button
      v-if="canArchive && !invoice.isArchived"
      type="button"
      @click="$emit('archive')"
      :disabled="loading"
      class="px-3.5 py-2 bg-panel-raised hover:bg-surface-hover text-muted-custom hover:text-main border border-custom rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
      <span>Archiver</span>
    </button>

    <button
      v-if="canArchive && invoice.isArchived"
      type="button"
      @click="$emit('restore')"
      :disabled="loading"
      class="px-3.5 py-2 bg-[#b49c80]/15 hover:bg-[#b49c80]/25 text-[#987d61] dark:text-[#d0baa0] border border-[#b49c80]/30 rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span>Restaurer</span>
    </button>

    <!-- Delete Action (DRAFT & SUPER_ADMIN) -->
    <button
      v-if="invoice.status === 'DRAFT' && isSuperAdmin"
      type="button"
      @click="$emit('delete')"
      :disabled="loading"
      class="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-control text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <span>Supprimer</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  invoice: any
  userRole?: string
  loading?: boolean
}>()

const emit = defineEmits([
  'finalize',
  'open-payment-modal',
  'open-cancel-modal',
  'archive',
  'restore',
  'delete'
])

const isSuperAdmin = computed(() => props.userRole === 'SUPER_ADMIN')
const canArchive = computed(() => ['SUPER_ADMIN', 'ACCOUNTANT'].includes(props.userRole || ''))
</script>
