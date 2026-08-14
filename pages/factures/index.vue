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

    <!-- Filter Tabs (Actifs, Archivés, Tous) -->
    <div class="flex items-center gap-2 border-b border-slate-800 pb-2">
      <button
        type="button"
        @click="setArchivedStatus('active')"
        class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        :class="activeArchivedStatus === 'active' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200'"
      >
        Actifs
      </button>
      <button
        type="button"
        @click="setArchivedStatus('archived')"
        class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        :class="activeArchivedStatus === 'archived' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200'"
      >
        Archivés
      </button>
      <button
        type="button"
        @click="setArchivedStatus('all')"
        class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        :class="activeArchivedStatus === 'all' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200'"
      >
        Tous
      </button>
    </div>

    <!-- Filters component -->
    <InvoiceFilters :clients="clientsList" @update:filters="handleFilterUpdate" />

    <!-- Bulk Selection Floating Toolbar (Super Admin) -->
    <BulkSelectionToolbar
      v-if="isSuperAdmin"
      :selected-count="selectionMode === 'ALL_FILTERED' ? pagination.totalItems : selectedIds.length"
      :page-count="invoices.length"
      :total-matching="pagination.totalItems"
      :is-all-matching-selected="selectionMode === 'ALL_FILTERED'"
      :is-archived-view="activeArchivedStatus === 'archived'"
      @archive="openBulkModal('ARCHIVE')"
      @delete="openBulkModal('DELETE_DRAFTS')"
      @restore="openBulkModal('RESTORE')"
      @clear="clearSelection"
      @select-all-matching="selectAllMatchingFiltered"
    />

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
              <th v-if="isSuperAdmin" class="py-3.5 px-4 w-10">
                <input
                  type="checkbox"
                  :checked="isCurrentPageAllSelected"
                  @change="toggleSelectCurrentPage"
                  class="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                />
              </th>
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
              :class="{ 'opacity-60 bg-slate-950/40': invoice.isArchived, 'bg-amber-500/5': isSelected(invoice.id) }"
            >
              <td v-if="isSuperAdmin" class="py-3.5 px-4">
                <input
                  type="checkbox"
                  :checked="isSelected(invoice.id)"
                  @change="toggleSelectRow(invoice.id)"
                  class="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                />
              </td>

              <td class="py-3.5 px-4 font-mono font-bold">
                <div class="flex items-center gap-1.5">
                  <NuxtLink :to="`/factures/${invoice.id}`" class="text-amber-400 hover:text-amber-300 transition-colors">
                    {{ invoice.number || `BROUILLON #${invoice.id.substring(0, 6).toUpperCase()}` }}
                  </NuxtLink>
                  <span v-if="invoice.isArchived" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    ARCHIVÉ
                  </span>
                </div>
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

                <!-- 3. Individual Archive / Restore / Delete (Super Admin) -->
                <template v-if="isSuperAdmin">
                  <button
                    v-if="invoice.isArchived"
                    type="button"
                    @click="openSingleAction(invoice, 'RESTORE')"
                    class="p-2 inline-flex items-center text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Restaurer"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    v-else
                    type="button"
                    @click="openSingleAction(invoice, 'ARCHIVE')"
                    class="p-2 inline-flex items-center text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Archiver"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                </template>
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

    <!-- GitHub Destructive Confirmation Modal -->
    <GitHubDestructiveModal
      :show="showBulkModal"
      :action-type="activeActionType"
      :count="selectionMode === 'ALL_FILTERED' ? pagination.totalItems : selectedIds.length"
      :preview-data="bulkPreviewData"
      :loading="executingAction"
      document-label="factures"
      @close="showBulkModal = false"
      @confirm="handleConfirmBulk"
    />

    <!-- Operation Summary Result Modal -->
    <BulkResultModal
      :show="showResultModal"
      :result="bulkExecutionResult"
      @close="showResultModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useInvoices } from '~/composables/useInvoices'
import { formatMoney } from '~/server/utils/calculation'
import InvoiceFilters from '~/components/invoices/InvoiceFilters.vue'
import InvoiceStatusBadge from '~/components/invoices/InvoiceStatusBadge.vue'
import PaymentStatusBadge from '~/components/invoices/PaymentStatusBadge.vue'
import Pagination from '~/components/ui/Pagination.vue'
import DocumentPdfPreviewModal from '~/components/ui/DocumentPdfPreviewModal.vue'
import BulkSelectionToolbar from '~/components/ui/BulkSelectionToolbar.vue'
import GitHubDestructiveModal from '~/components/ui/GitHubDestructiveModal.vue'
import BulkResultModal from '~/components/ui/BulkResultModal.vue'
import { useNotify } from '~/composables/useNotify'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { user } = useAuth()
const { notifySuccess, notifyError } = useNotify()
const { loading, error, invoices, pagination, fetchInvoices } = useInvoices()

const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')

const clientsList = ref<Array<{ id: string; displayName: string }>>([])
const activeFilters = ref<any>({})
const activeArchivedStatus = ref<'active' | 'archived' | 'all'>('active')

// Selection States
const selectedIds = ref<string[]>([])
const selectionMode = ref<'EXPLICIT' | 'ALL_FILTERED'>('EXPLICIT')

// PDF Preview Modal States
const showPdfPreview = ref(false)
const previewPdfUrl = ref('')
const previewDocNumber = ref('')

// Bulk & Destructive Modal States
const showBulkModal = ref(false)
const activeActionType = ref<'ARCHIVE' | 'DELETE_DRAFTS' | 'MIXED_CLEANUP' | 'RESTORE'>('ARCHIVE')
const bulkPreviewData = ref<any>(null)
const executingAction = ref(false)
const showResultModal = ref(false)
const bulkExecutionResult = ref<any>(null)

const isSelected = (id: string) => {
  if (selectionMode.value === 'ALL_FILTERED') return true
  return selectedIds.value.includes(id)
}

const isCurrentPageAllSelected = computed(() => {
  if (invoices.value.length === 0) return false
  if (selectionMode.value === 'ALL_FILTERED') return true
  return invoices.value.every((inv) => selectedIds.value.includes(inv.id))
})

const toggleSelectCurrentPage = () => {
  if (isCurrentPageAllSelected.value) {
    clearSelection()
  } else {
    selectionMode.value = 'EXPLICIT'
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...invoices.value.map((i) => i.id)]))
  }
}

const toggleSelectRow = (id: string) => {
  if (selectionMode.value === 'ALL_FILTERED') {
    selectionMode.value = 'EXPLICIT'
    selectedIds.value = invoices.value.map((i) => i.id).filter((iId) => iId !== id)
    return
  }
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

const selectAllMatchingFiltered = () => {
  selectionMode.value = 'ALL_FILTERED'
}

const clearSelection = () => {
  selectedIds.value = []
  selectionMode.value = 'EXPLICIT'
}

const setArchivedStatus = async (status: 'active' | 'archived' | 'all') => {
  clearSelection()
  activeArchivedStatus.value = status
  await handleFilterUpdate(activeFilters.value)
}

const openPdfPreview = (invoice: any) => {
  previewPdfUrl.value = `/api/invoices/${invoice.id}/pdf`
  previewDocNumber.value = invoice.number || `BROUILLON #${invoice.id.substring(0, 6).toUpperCase()}`
  showPdfPreview.value = true
}

const openSingleAction = (invoice: any, action: 'ARCHIVE' | 'RESTORE') => {
  clearSelection()
  selectedIds.value = [invoice.id]
  openBulkModal(action)
}

const openBulkModal = async (action: 'ARCHIVE' | 'DELETE_DRAFTS' | 'MIXED_CLEANUP' | 'RESTORE') => {
  activeActionType.value = action
  bulkPreviewData.value = null
  showBulkModal.value = true

  try {
    const res = await $fetch<any>('/api/admin/documents/preview', {
      method: 'POST',
      body: {
        documentType: 'INVOICE',
        selectionMode: selectionMode.value,
        explicitIds: selectionMode.value === 'EXPLICIT' ? selectedIds.value : undefined,
        filters: { ...activeFilters.value, archivedStatus: activeArchivedStatus.value.toUpperCase() }
      }
    })
    if (res.success) {
      bulkPreviewData.value = res.data
    }
  } catch (err: any) {
    notifyError(err.data?.message || 'Erreur lors de la prévisualisation de la sélection.')
  }
}

const handleConfirmBulk = async (payload: { reason: string; confirmationPhrase: string; password?: string }) => {
  executingAction.value = true

  try {
    const res = await $fetch<any>('/api/admin/documents/execute', {
      method: 'POST',
      body: {
        documentType: 'INVOICE',
        actionType: activeActionType.value,
        selectionMode: selectionMode.value,
        explicitIds: selectionMode.value === 'EXPLICIT' ? selectedIds.value : undefined,
        filters: { ...activeFilters.value, archivedStatus: activeArchivedStatus.value.toUpperCase() },
        reason: payload.reason,
        confirmationPhrase: payload.confirmationPhrase,
        password: payload.password
      }
    })

    if (res.success) {
      showBulkModal.value = false
      bulkExecutionResult.value = res.data
      showResultModal.value = true
      clearSelection()
      notifySuccess(`${res.data.totalSelected} document(s) traité(s) avec succès.`)
      await fetchInvoices({ ...activeFilters.value, page: pagination.value.page })
    }
  } catch (err: any) {
    notifyError(err.data?.message || err.message || 'Échec du traitement du document.')
  } finally {
    executingAction.value = false
  }
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
  clearSelection()
  activeFilters.value = filters
  let statusQuery = 'active'
  if (activeArchivedStatus.value === 'archived') statusQuery = 'archived'
  if (activeArchivedStatus.value === 'all') statusQuery = 'all'

  await fetchInvoices({ ...filters, archiveStatus: statusQuery, page: 1 })
}

const changePage = async (newPage: number) => {
  let statusQuery = 'active'
  if (activeArchivedStatus.value === 'archived') statusQuery = 'archived'
  if (activeArchivedStatus.value === 'all') statusQuery = 'all'

  await fetchInvoices({ ...activeFilters.value, archiveStatus: statusQuery, page: newPage })
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
