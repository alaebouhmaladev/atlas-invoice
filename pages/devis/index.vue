<template>
  <div class="space-y-6">
    <!-- Page Header & Primary Action -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-extrabold text-main tracking-tight">Devis</h2>
        <p class="text-xs text-muted-custom mt-1">Gérez la création, le suivi, l'envoi et la validation des devis traiteur.</p>
      </div>

      <NuxtLink
        to="/devis/new"
        class="px-4 py-2 bg-[#b49c80] hover:bg-[#987d61] text-slate-950 font-bold rounded-pill text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nouveau devis</span>
      </NuxtLink>
    </div>

    <!-- Filter Tabs (Actifs, Archivés, Tous) -->
    <div class="flex items-center gap-2 border-b border-custom pb-2">
      <button
        type="button"
        @click="setArchivedStatus('active')"
        class="px-3.5 py-1.5 rounded-pill text-xs font-bold transition-colors cursor-pointer"
        :class="queryFilters.archiveStatus === 'active' ? 'bg-[#b49c80]/15 text-[#987d61] dark:text-[#d0baa0] border border-[#b49c80]/30' : 'text-muted-custom hover:text-main'"
      >
        Actifs
      </button>
      <button
        type="button"
        @click="setArchivedStatus('archived')"
        class="px-3.5 py-1.5 rounded-pill text-xs font-bold transition-colors cursor-pointer"
        :class="queryFilters.archiveStatus === 'archived' ? 'bg-[#b49c80]/15 text-[#987d61] dark:text-[#d0baa0] border border-[#b49c80]/30' : 'text-muted-custom hover:text-main'"
      >
        Archivés
      </button>
      <button
        type="button"
        @click="setArchivedStatus('all')"
        class="px-3.5 py-1.5 rounded-pill text-xs font-bold transition-colors cursor-pointer"
        :class="queryFilters.archiveStatus === 'all' ? 'bg-[#b49c80]/15 text-[#987d61] dark:text-[#d0baa0] border border-[#b49c80]/30' : 'text-muted-custom hover:text-main'"
      >
        Tous
      </button>
    </div>

    <!-- Filters -->
    <QuoteFilters
      :search="queryFilters.search"
      :status="queryFilters.status"
      :archive-status="queryFilters.archiveStatus"
      @update:filters="handleFilterUpdate"
    />

    <!-- Bulk Selection Floating Toolbar (Super Admin) -->
    <BulkSelectionToolbar
      v-if="canDelete"
      :selected-count="selectionMode === 'ALL_FILTERED' ? pagination.totalItems : selectedIds.length"
      :page-count="quotes.length"
      :total-matching="pagination.totalItems"
      :is-all-matching-selected="selectionMode === 'ALL_FILTERED'"
      :is-archived-view="queryFilters.archiveStatus === 'archived'"
      @archive="openBulkModal('ARCHIVE')"
      @delete="openBulkModal('DELETE_DRAFTS')"
      @restore="openBulkModal('RESTORE')"
      @clear="clearSelection"
      @select-all-matching="selectAllMatchingFiltered"
    />

    <!-- Error Banner -->
    <div
      v-if="error"
      class="p-4 rounded-card bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3"
      role="alert"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ error }}</span>
      </div>
      <button
        @click="loadQuotes"
        class="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 rounded-control font-semibold text-[11px] transition-colors"
      >
        Réessayer
      </button>
    </div>

    <!-- Main Directory Table Container -->
    <div class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <!-- Loading State -->
      <div v-if="loading && quotes.length === 0" class="p-12 text-center text-muted-custom">
        <svg class="animate-spin h-8 w-8 text-[#b49c80] mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-xs">Chargement de la liste des devis...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && quotes.length === 0" class="p-12 text-center space-y-3">
        <div class="w-12 h-12 rounded-card bg-panel-raised text-muted-custom flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-main">Aucun devis trouvé</h3>
        <p class="text-xs text-muted-custom max-w-sm mx-auto">
          {{ queryFilters.search || queryFilters.status !== 'all' ? 'Aucun devis ne correspond aux critères de recherche.' : 'Aucun devis créé pour le moment.' }}
        </p>
        <div class="pt-2">
          <NuxtLink
            to="/devis/new"
            class="inline-flex items-center gap-2 px-4 py-2 bg-[#b49c80] hover:bg-[#987d61] text-slate-950 font-bold rounded-pill text-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Créer le premier devis</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Quotes Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-custom bg-panel-raised text-muted-custom uppercase tracking-wider font-bold">
              <th v-if="canDelete" class="py-3.5 px-4 w-10">
                <input
                  type="checkbox"
                  :checked="isCurrentPageAllSelected"
                  @change="toggleSelectCurrentPage"
                  class="rounded bg-panel-raised border-custom text-[#b49c80] focus:ring-[#b49c80]/40 cursor-pointer"
                />
              </th>
              <th class="py-3.5 px-4">Numéro</th>
              <th class="py-3.5 px-4">Client</th>
              <th class="py-3.5 px-4">Émission</th>
              <th class="py-3.5 px-4">Validité</th>
              <th class="py-3.5 px-4">Total TTC</th>
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4">Créé par</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom">
            <tr
              v-for="quote in quotes"
              :key="quote.id"
              class="hover:bg-surface-hover transition-colors"
              :class="{ 'opacity-60 bg-panel-raised': quote.isArchived, 'bg-[#b49c80]/5': isSelected(quote.id) }"
            >
              <td v-if="canDelete" class="py-3.5 px-4">
                <input
                  type="checkbox"
                  :checked="isSelected(quote.id)"
                  @change="toggleSelectRow(quote.id)"
                  class="rounded bg-panel-raised border-custom text-[#b49c80] focus:ring-[#b49c80]/40 cursor-pointer"
                />
              </td>

              <!-- Number -->
              <td class="py-3.5 px-4 font-mono font-bold text-[#987d61] dark:text-[#d0baa0]">
                <div class="flex items-center gap-1.5">
                  <NuxtLink :to="`/devis/${quote.id}`" class="hover:underline">
                    {{ quote.number }}
                  </NuxtLink>
                  <span v-if="quote.isArchived" class="px-1.5 py-0.5 rounded-pill text-[10px] font-bold bg-[#b49c80]/15 text-[#987d61] dark:text-[#d0baa0] border border-[#b49c80]/30">
                    ARCHIVÉ
                  </span>
                </div>
                <span v-if="quote.subject" class="text-[11px] font-sans font-normal text-muted-custom block truncate max-w-[160px]">
                  {{ quote.subject }}
                </span>
              </td>

              <!-- Client Snapshot -->
              <td class="py-3.5 px-4">
                <NuxtLink v-if="quote.clientId" :to="`/clients/${quote.clientId}`" class="font-bold text-main hover:text-[#b49c80] transition-colors block">
                  {{ quote.clientSnapshot?.displayName || quote.client?.displayName || 'Client' }}
                </NuxtLink>
                <span v-else class="font-bold text-main block">
                  {{ quote.clientSnapshot?.displayName || 'Client' }}
                </span>
                <span v-if="quote.clientSnapshot?.city" class="text-[11px] text-muted-custom block">
                  {{ quote.clientSnapshot.city }}
                </span>
              </td>

              <!-- Issue Date -->
              <td class="py-3.5 px-4 text-secondary-custom">
                {{ formatDate(quote.issueDate) }}
              </td>

              <!-- Valid Until Date (Highlighted if Expired) -->
              <td class="py-3.5 px-4">
                <span :class="isExpiredDate(quote.validUntil) && quote.status === 'SENT' ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-secondary-custom'">
                  {{ formatDate(quote.validUntil) }}
                </span>
              </td>

              <!-- Total TTC -->
              <td class="py-3.5 px-4 font-mono font-bold text-main">
                {{ formatMoney(quote.totalTtc) }}
              </td>

              <!-- Status Badge -->
              <td class="py-3.5 px-4">
                <QuoteStatusBadge :status="quote.status" />
              </td>

              <!-- Created By -->
              <td class="py-3.5 px-4 text-muted-custom text-[11px]">
                {{ quote.createdBy?.name || '—' }}
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                <!-- 1. View Details -->
                <NuxtLink
                  :to="`/devis/${quote.id}`"
                  class="p-1.5 inline-flex items-center text-muted-custom hover:text-main hover:bg-surface-hover rounded-control transition-colors cursor-pointer"
                  title="Voir les détails"
                  aria-label="Voir les détails du devis"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </NuxtLink>

                <!-- 2. Edit (Draft only) -->
                <NuxtLink
                  v-if="quote.status === 'DRAFT'"
                  :to="`/devis/${quote.id}/edit`"
                  class="p-1.5 inline-flex items-center text-muted-custom hover:text-[#b49c80] hover:bg-surface-hover rounded-control transition-colors cursor-pointer"
                  title="Modifier"
                  aria-label="Modifier le devis"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </NuxtLink>

                <!-- 3. Preview PDF -->
                <button
                  type="button"
                  @click="openPdfPreview(quote)"
                  class="p-1.5 inline-flex items-center text-muted-custom hover:text-[#b49c80] hover:bg-surface-hover rounded-control transition-colors cursor-pointer"
                  title="Prévisualiser le PDF"
                  aria-label="Prévisualiser le PDF du devis"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>

                <!-- Duplicate -->
                <button
                  type="button"
                  @click="handleDuplicate(quote)"
                  class="p-1.5 inline-flex items-center text-muted-custom hover:text-sky-500 hover:bg-surface-hover rounded-control transition-colors cursor-pointer"
                  title="Dupliquer"
                  aria-label="Dupliquer le devis"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                <!-- 4. Archive / Restore (SUPER_ADMIN) -->
                <button
                  v-if="canDelete"
                  type="button"
                  @click="openSingleAction(quote, quote.isArchived ? 'RESTORE' : 'ARCHIVE')"
                  class="p-1.5 inline-flex items-center text-muted-custom hover:text-amber-500 hover:bg-surface-hover rounded-control transition-colors cursor-pointer"
                  :title="quote.isArchived ? 'Restaurer' : 'Archiver'"
                  :aria-label="quote.isArchived ? 'Restaurer le devis' : 'Archiver le devis'"
                >
                  <svg v-if="!quote.isArchived" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8zm14 0l-4-4H9L5 8" />
                  </svg>
                  <svg v-else class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <!-- 5. Permanent Delete (SUPER_ADMIN ONLY on DRAFT) -->
                <button
                  v-if="canDelete && quote.status === 'DRAFT' && !quote.isArchived"
                  type="button"
                  @click="openSingleAction(quote, 'DELETE_DRAFTS')"
                  class="p-1.5 inline-flex items-center text-muted-custom hover:text-rose-500 hover:bg-surface-hover rounded-control transition-colors cursor-pointer"
                  title="Supprimer définitivement"
                  aria-label="Supprimer définitivement le devis brouillon"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="quotes.length > 0" class="p-4 bg-panel-raised border-t border-custom">
        <Pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :total-items="pagination.totalItems"
          :total-pages="pagination.totalPages"
          @change-page="handlePageChange"
        />
      </div>
    </div>

    <!-- PDF Preview Modal -->
    <DocumentPdfPreviewModal
      :show="showPdfPreview"
      :pdf-url="previewPdfUrl"
      title="Aperçu du PDF — Devis"
      :document-number="previewDocNumber"
      :filename="`Devis_${previewDocNumber}.pdf`"
      @close="showPdfPreview = false"
    />

    <!-- GitHub Destructive Confirmation Modal -->
    <GitHubDestructiveModal
      :show="showBulkModal"
      :action-type="activeActionType"
      :count="selectionMode === 'ALL_FILTERED' ? pagination.totalItems : selectedIds.length"
      :preview-data="bulkPreviewData"
      :loading="executingAction"
      document-label="devis"
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
import { ref, reactive, computed } from 'vue'
import QuoteFilters from '~/components/quotes/QuoteFilters.vue'
import QuoteStatusBadge from '~/components/quotes/QuoteStatusBadge.vue'
import Pagination from '~/components/ui/Pagination.vue'
import DocumentPdfPreviewModal from '~/components/ui/DocumentPdfPreviewModal.vue'
import BulkSelectionToolbar from '~/components/ui/BulkSelectionToolbar.vue'
import GitHubDestructiveModal from '~/components/ui/GitHubDestructiveModal.vue'
import BulkResultModal from '~/components/ui/BulkResultModal.vue'
import { formatMoney } from '~/server/utils/calculation'
import type { QuoteStatus } from '@prisma/client'
import type { QuoteWithRelations } from '~/composables/useQuotes'
import { useNotify } from '~/composables/useNotify'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { notifySuccess, notifyError } = useNotify()
const { quotes, pagination, loading, error, fetchQuotes, duplicateQuote } = useQuotes()

const canDelete = computed(() => user.value?.role === 'SUPER_ADMIN')

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

function openPdfPreview(quote: QuoteWithRelations) {
  previewPdfUrl.value = `/api/quotes/${quote.id}/pdf`
  previewDocNumber.value = quote.number
  showPdfPreview.value = true
}

const queryFilters = reactive<{
  search?: string
  status: QuoteStatus | 'all'
  archiveStatus: 'active' | 'archived' | 'all'
  page: number
}>({
  search: (route.query.search as string) || undefined,
  status: (route.query.status as QuoteStatus | 'all') || 'all',
  archiveStatus: (route.query.archiveStatus as 'active' | 'archived' | 'all') || 'active',
  page: route.query.page ? parseInt(route.query.page as string, 10) : 1
})

const isSelected = (id: string) => {
  if (selectionMode.value === 'ALL_FILTERED') return true
  return selectedIds.value.includes(id)
}

const isCurrentPageAllSelected = computed(() => {
  if (quotes.value.length === 0) return false
  if (selectionMode.value === 'ALL_FILTERED') return true
  return quotes.value.every((q) => selectedIds.value.includes(q.id))
})

const toggleSelectCurrentPage = () => {
  if (isCurrentPageAllSelected.value) {
    clearSelection()
  } else {
    selectionMode.value = 'EXPLICIT'
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...quotes.value.map((q) => q.id)]))
  }
}

const toggleSelectRow = (id: string) => {
  if (selectionMode.value === 'ALL_FILTERED') {
    selectionMode.value = 'EXPLICIT'
    selectedIds.value = quotes.value.map((q) => q.id).filter((qId) => qId !== id)
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

const setArchivedStatus = (status: 'active' | 'archived' | 'all') => {
  clearSelection()
  queryFilters.archiveStatus = status
  queryFilters.page = 1
  syncUrlQuery()
  loadQuotes()
}

async function loadQuotes() {
  await fetchQuotes({
    search: queryFilters.search,
    status: queryFilters.status,
    archiveStatus: queryFilters.archiveStatus,
    page: queryFilters.page
  })
}

function handleFilterUpdate(filters: { search?: string; status: QuoteStatus | 'all'; archiveStatus: 'active' | 'archived' | 'all' }) {
  clearSelection()
  queryFilters.search = filters.search
  queryFilters.status = filters.status
  queryFilters.archiveStatus = filters.archiveStatus
  queryFilters.page = 1

  syncUrlQuery()
  loadQuotes()
}

function handlePageChange(newPage: number) {
  queryFilters.page = newPage
  syncUrlQuery()
  loadQuotes()
}

function syncUrlQuery() {
  router.push({
    query: {
      search: queryFilters.search || undefined,
      status: queryFilters.status !== 'all' ? queryFilters.status : undefined,
      archiveStatus: queryFilters.archiveStatus !== 'active' ? queryFilters.archiveStatus : undefined,
      page: queryFilters.page > 1 ? queryFilters.page : undefined
    }
  })
}

async function handleDuplicate(quote: QuoteWithRelations) {
  const result = await duplicateQuote(quote.id)
  if (result.success && result.quote) {
    notifySuccess(`Nouveau devis "${result.quote.number}" créé sous forme de brouillon.`)
    await navigateTo(`/devis/${result.quote.id}/edit`)
  } else {
    notifyError(result.message || 'Échec de la duplication')
  }
}

const openSingleAction = (quote: QuoteWithRelations, action: 'ARCHIVE' | 'DELETE_DRAFTS' | 'RESTORE') => {
  clearSelection()
  selectedIds.value = [quote.id]
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
        documentType: 'QUOTE',
        selectionMode: selectionMode.value,
        explicitIds: selectionMode.value === 'EXPLICIT' ? selectedIds.value : undefined,
        filters: { search: queryFilters.search, status: queryFilters.status, archivedStatus: queryFilters.archiveStatus.toUpperCase() }
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
        documentType: 'QUOTE',
        actionType: activeActionType.value,
        selectionMode: selectionMode.value,
        explicitIds: selectionMode.value === 'EXPLICIT' ? selectedIds.value : undefined,
        filters: { search: queryFilters.search, status: queryFilters.status, archivedStatus: queryFilters.archiveStatus.toUpperCase() },
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
      notifySuccess(`${res.data.totalSelected} devis traité(s) avec succès.`)
      await loadQuotes()
    }
  } catch (err: any) {
    notifyError(err.data?.message || err.message || 'Échec du traitement des devis.')
  } finally {
    executingAction.value = false
  }
}

function formatDate(dateInput: string | Date): string {
  const d = new Date(dateInput)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function isExpiredDate(dateInput: string | Date): boolean {
  return new Date(dateInput) < new Date()
}

await useAsyncData('quotes-list', () => loadQuotes(), {
  watch: [() => queryFilters.search, () => queryFilters.status, () => queryFilters.archiveStatus, () => queryFilters.page]
})
</script>
