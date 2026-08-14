<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-100 tracking-tight">Factures</h2>
        <p class="text-xs text-slate-400 mt-1">Gérez l'émission, la finalisation et le suivi des encaissements factures.</p>
      </div>

      <NuxtLink
        to="/factures/new"
        class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nouvelle Facture</span>
      </NuxtLink>
    </div>

    <!-- Filters component -->
    <InvoiceFilters :clients="clientsList" @update:filters="handleFilterUpdate" />

    <!-- Error message alert -->
    <div
      v-if="error"
      class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3"
      role="alert"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button
        @click="() => fetchInvoices()"
        class="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg font-semibold text-[11px] transition-colors"
      >
        Réessayer
      </button>
    </div>

    <!-- Main Table Container -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
      <!-- Loading State -->
      <div v-if="loading && invoices.length === 0" class="p-12 text-center text-slate-400">
        <svg class="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-xs">Chargement des factures...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && invoices.length === 0" class="p-12 text-center space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-slate-200">Aucune facture trouvée</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          Ajustez vos filtres de recherche ou créez votre première facture.
        </p>
        <div class="pt-2">
          <NuxtLink
            to="/factures/new"
            class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Créer la première facture</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Invoices Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold">
              <th class="py-3.5 px-4">Numéro</th>
              <th class="py-3.5 px-4">Client</th>
              <th class="py-3.5 px-4">Émission / Échéance</th>
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4">Règlement</th>
              <th class="py-3.5 px-4 text-right">Total TTC</th>
              <th class="py-3.5 px-4 text-right">Reste à payer</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="invoice in invoices"
              :key="invoice.id"
              class="hover:bg-slate-800/30 transition-colors"
              :class="{ 'opacity-60 bg-slate-950/40': invoice.isArchived }"
            >
              <td class="py-3.5 px-4 font-mono font-bold">
                <NuxtLink :to="`/factures/${invoice.id}`" class="text-amber-400 hover:text-amber-300 transition-colors">
                  {{ invoice.number || `BROUILLON #${invoice.id.substring(0, 6).toUpperCase()}` }}
                </NuxtLink>
                <div v-if="invoice.sourceQuote" class="text-[11px] text-slate-500 font-sans font-normal">
                  Devis : {{ invoice.sourceQuote.number }}
                </div>
              </td>

              <td class="py-3.5 px-4">
                <div class="font-semibold text-slate-200">
                  {{ invoice.clientSnapshot?.displayName || invoice.client?.displayName }}
                </div>
                <div class="text-[11px] text-slate-400">
                  {{ invoice.clientSnapshot?.city || 'Maroc' }}
                </div>
              </td>

              <td class="py-3.5 px-4">
                <div class="text-slate-300 font-mono">{{ formatDate(invoice.issueDate) }}</div>
                <div class="text-slate-500 text-[11px]">Échéance : {{ formatDate(invoice.dueDate) }}</div>
              </td>

              <td class="py-3.5 px-4">
                <InvoiceStatusBadge :status="invoice.status" />
              </td>

              <td class="py-3.5 px-4">
                <PaymentStatusBadge :status="invoice.paymentStatus" :is-overdue="invoice.isOverdue" />
              </td>

              <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                {{ formatMoney(invoice.totalTtc) }}
              </td>

              <td class="py-3.5 px-4 text-right font-mono font-bold" :class="Number(invoice.amountDue) > 0 ? 'text-rose-400' : 'text-emerald-400'">
                {{ formatMoney(invoice.amountDue) }}
              </td>

              <td class="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                <!-- 1. View Details -->
                <NuxtLink
                  :to="`/factures/${invoice.id}`"
                  class="p-2 inline-flex items-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                  title="Voir les détails"
                  aria-label="Voir les détails de la facture"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 01-6 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </NuxtLink>

                <!-- 2. Preview PDF -->
                <button
                  type="button"
                  @click="openPdfPreview(invoice)"
                  class="p-2 inline-flex items-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                  title="Prévisualiser le PDF"
                  aria-label="Prévisualiser le PDF de la facture"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="invoices.length > 0" class="p-4 bg-slate-950/40 border-t border-slate-800">
        <Pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :total-items="pagination.totalItems"
          :total-pages="pagination.totalPages"
          @change-page="changePage"
        />
      </div>
    </div>

    <!-- PDF Preview Modal -->
    <DocumentPdfPreviewModal
      :show="showPdfPreview"
      :pdf-url="previewPdfUrl"
      title="Aperçu du PDF — Facture"
      :document-number="previewDocNumber"
      :filename="`Facture_${previewDocNumber}.pdf`"
      @close="showPdfPreview = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useInvoices } from '~/composables/useInvoices'
import { formatMoney } from '~/server/utils/calculation'
import InvoiceFilters from '~/components/invoices/InvoiceFilters.vue'
import InvoiceStatusBadge from '~/components/invoices/InvoiceStatusBadge.vue'
import PaymentStatusBadge from '~/components/invoices/PaymentStatusBadge.vue'
import Pagination from '~/components/ui/Pagination.vue'
import DocumentPdfPreviewModal from '~/components/ui/DocumentPdfPreviewModal.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { loading, error, invoices, pagination, fetchInvoices } = useInvoices()

const clientsList = ref<Array<{ id: string; displayName: string }>>([])
const activeFilters = ref<any>({})

// PDF Preview Modal States
const showPdfPreview = ref(false)
const previewPdfUrl = ref('')
const previewDocNumber = ref('')

const openPdfPreview = (invoice: any) => {
  previewPdfUrl.value = `/api/invoices/${invoice.id}/pdf`
  previewDocNumber.value = invoice.number || `BROUILLON #${invoice.id.substring(0, 6).toUpperCase()}`
  showPdfPreview.value = true
}

onMounted(async () => {
  try {
    const clientsRes = await $fetch<any>('/api/clients?pageSize=100', {
      headers: useRequestHeaders(['cookie'])
    })
    if (clientsRes.success) {
      clientsList.value = clientsRes.data.data
    }
  } catch (e) {
    // fallback
  }
  await fetchInvoices()
})

const handleFilterUpdate = async (filters: any) => {
  activeFilters.value = filters
  await fetchInvoices({ ...filters, page: 1 })
}

const changePage = async (newPage: number) => {
  await fetchInvoices({ ...activeFilters.value, page: newPage })
}

const formatDate = (dateInput: Date | string) => {
  if (!dateInput) return '—'
  return new Date(dateInput).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
</script>
