<template>
  <div class="space-y-6">
    <!-- Page Header & Primary Action -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-100 tracking-tight">Devis</h2>
        <p class="text-xs text-slate-400 mt-1">Gérez la création, le suivi, l'envoi et la validation des devis traiteur.</p>
      </div>

      <NuxtLink
        to="/devis/new"
        class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nouveau devis</span>
      </NuxtLink>
    </div>

    <!-- Filters -->
    <QuoteFilters
      :search="queryFilters.search"
      :status="queryFilters.status"
      :archive-status="queryFilters.archiveStatus"
      @update:filters="handleFilterUpdate"
    />

    <!-- Error Banner -->
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
        @click="loadQuotes"
        class="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg font-semibold text-[11px] transition-colors"
      >
        Réessayer
      </button>
    </div>

    <!-- Main Directory Table Container -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
      <!-- Loading State -->
      <div v-if="loading && quotes.length === 0" class="p-12 text-center text-slate-400">
        <svg class="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-xs">Chargement de la liste des devis...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && quotes.length === 0" class="p-12 text-center space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-slate-200">Aucun devis trouvé</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          {{ queryFilters.search || queryFilters.status !== 'all' ? 'Aucun devis ne correspond aux critères de recherche.' : 'Aucun devis créé pour le moment.' }}
        </p>
        <div class="pt-2">
          <NuxtLink
            to="/devis/new"
            class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
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
            <tr class="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold">
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
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="quote in quotes"
              :key="quote.id"
              class="hover:bg-slate-800/30 transition-colors"
              :class="{ 'opacity-60 bg-slate-950/40': quote.isArchived }"
            >
              <!-- Number -->
              <td class="py-3.5 px-4 font-mono font-bold text-amber-400">
                <NuxtLink :to="`/devis/${quote.id}`" class="hover:underline">
                  {{ quote.number }}
                </NuxtLink>
                <span v-if="quote.subject" class="text-[11px] font-sans font-normal text-slate-400 block truncate max-w-[160px]">
                  {{ quote.subject }}
                </span>
              </td>

              <!-- Client Snapshot -->
              <td class="py-3.5 px-4">
                <NuxtLink v-if="quote.clientId" :to="`/clients/${quote.clientId}`" class="font-bold text-slate-100 hover:text-amber-400 transition-colors block">
                  {{ quote.clientSnapshot?.displayName || quote.client?.displayName || 'Client' }}
                </NuxtLink>
                <span v-else class="font-bold text-slate-100 block">
                  {{ quote.clientSnapshot?.displayName || 'Client' }}
                </span>
                <span v-if="quote.clientSnapshot?.city" class="text-[11px] text-slate-400 block">
                  {{ quote.clientSnapshot.city }}
                </span>
              </td>

              <!-- Issue Date -->
              <td class="py-3.5 px-4 text-slate-300">
                {{ formatDate(quote.issueDate) }}
              </td>

              <!-- Valid Until Date (Highlighted if Expired) -->
              <td class="py-3.5 px-4">
                <span :class="isExpiredDate(quote.validUntil) && quote.status === 'SENT' ? 'text-rose-400 font-bold' : 'text-slate-300'">
                  {{ formatDate(quote.validUntil) }}
                </span>
              </td>

              <!-- Total TTC -->
              <td class="py-3.5 px-4 font-mono font-bold text-slate-100">
                {{ formatMoney(quote.totalTtc) }}
              </td>

              <!-- Status Badge -->
              <td class="py-3.5 px-4">
                <QuoteStatusBadge :status="quote.status" />
              </td>

              <!-- Created By -->
              <td class="py-3.5 px-4 text-slate-400 text-[11px]">
                {{ quote.createdBy?.name || '—' }}
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                <NuxtLink
                  :to="`/devis/${quote.id}`"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Voir le devis"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 01-6 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </NuxtLink>

                <button
                  type="button"
                  @click="downloadPdf(quote.id, quote.number)"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Télécharger PDF"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>

                <NuxtLink
                  v-if="quote.status === 'DRAFT'"
                  :to="`/devis/${quote.id}/edit`"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Modifier le brouillon"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </NuxtLink>

                <button
                  type="button"
                  @click="handleDuplicate(quote)"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Dupliquer"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                <!-- Archive / Restore (SUPER_ADMIN & ACCOUNTANT) -->
                <button
                  v-if="canArchiveRestore"
                  @click="openArchiveModal(quote)"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                  :title="quote.isArchived ? 'Restaurer' : 'Archiver'"
                >
                  <svg v-if="!quote.isArchived" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8zm14 0l-4-4H9L5 8" />
                  </svg>
                  <svg v-else class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <!-- Delete (SUPER_ADMIN ONLY on DRAFT) -->
                <button
                  v-if="canDelete && quote.status === 'DRAFT'"
                  @click="openDeleteModal(quote)"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Supprimer le brouillon"
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
      <div v-if="quotes.length > 0" class="p-4 bg-slate-950/40">
        <Pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :total-items="pagination.totalItems"
          :total-pages="pagination.totalPages"
          @change-page="handlePageChange"
        />
      </div>
    </div>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :show="showConfirmModal"
      :title="confirmModalTitle"
      :message="confirmModalMessage"
      :confirm-text="confirmModalButtonText"
      :danger="modalActionType === 'delete'"
      :loading="actionLoading"
      :require-match-text="modalActionType === 'delete' ? targetQuote?.number : undefined"
      @confirm="executeQuoteAction"
      @cancel="showConfirmModal = false"
    />

    <!-- Notification Toast -->
    <NotificationToast
      :show="showToast"
      :title="toastTitle"
      :message="toastMessage"
      :type="toastType"
      @close="showToast = false"
    />
  </div>
</template>

<script setup lang="ts">
import QuoteFilters from '~/components/quotes/QuoteFilters.vue'
import QuoteStatusBadge from '~/components/quotes/QuoteStatusBadge.vue'
import Pagination from '~/components/ui/Pagination.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import NotificationToast from '~/components/ui/NotificationToast.vue'
import { formatMoney } from '~/server/utils/calculation'
import type { QuoteStatus } from '@prisma/client'
import type { QuoteWithRelations } from '~/composables/useQuotes'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { quotes, pagination, loading, error, fetchQuotes, duplicateQuote, archiveQuote, restoreQuote, deleteQuote, downloadPdf } = useQuotes()

const canArchiveRestore = computed(() => ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user.value?.role || ''))
const canDelete = computed(() => user.value?.role === 'SUPER_ADMIN')

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

// Modal states
const showConfirmModal = ref(false)
const targetQuote = ref<QuoteWithRelations | null>(null)
const modalActionType = ref<'archive' | 'restore' | 'delete'>('archive')
const actionLoading = ref(false)

// Toast states
const showToast = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

const confirmModalTitle = computed(() => {
  if (modalActionType.value === 'delete') return 'Supprimer définitivement le devis'
  if (modalActionType.value === 'archive') return 'Archiver le devis'
  return 'Restaurer le devis'
})

const confirmModalMessage = computed(() => {
  if (!targetQuote.value) return ''
  if (modalActionType.value === 'delete') {
    return `Êtes-vous sûr de vouloir supprimer définitivement le devis "${targetQuote.value.number}" ? Cette action est irréversible.`
  }
  if (modalActionType.value === 'archive') {
    return `Voulez-vous archiver le devis "${targetQuote.value.number}" ?`
  }
  return `Voulez-vous restaurer le devis "${targetQuote.value.number}" dans la liste des devis actifs ?`
})

const confirmModalButtonText = computed(() => {
  if (modalActionType.value === 'delete') return 'Supprimer définitivement'
  if (modalActionType.value === 'archive') return 'Archiver le devis'
  return 'Restaurer le devis'
})

async function loadQuotes() {
  await fetchQuotes({
    search: queryFilters.search,
    status: queryFilters.status,
    archiveStatus: queryFilters.archiveStatus,
    page: queryFilters.page
  })
}

function handleFilterUpdate(filters: { search?: string; status: QuoteStatus | 'all'; archiveStatus: 'active' | 'archived' | 'all' }) {
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
    triggerToast('Devis dupliqué', `Nouveau devis "${result.quote.number}" créé sous forme de brouillon.`)
    await navigateTo(`/devis/${result.quote.id}/edit`)
  } else {
    triggerToast('Erreur', result.message || 'Échec de la duplication', 'error')
  }
}

function openArchiveModal(quote: QuoteWithRelations) {
  targetQuote.value = quote
  modalActionType.value = quote.isArchived ? 'restore' : 'archive'
  showConfirmModal.value = true
}

function openDeleteModal(quote: QuoteWithRelations) {
  targetQuote.value = quote
  modalActionType.value = 'delete'
  showConfirmModal.value = true
}

async function executeQuoteAction() {
  if (!targetQuote.value) return
  actionLoading.value = true

  try {
    let ok = false
    if (modalActionType.value === 'archive') {
      ok = await archiveQuote(targetQuote.value.id)
      if (ok) triggerToast('Devis archivé', `Le devis "${targetQuote.value.number}" a été archivé.`)
    } else if (modalActionType.value === 'restore') {
      ok = await restoreQuote(targetQuote.value.id)
      if (ok) triggerToast('Devis restauré', `Le devis "${targetQuote.value.number}" est à nouveau actif.`)
    } else if (modalActionType.value === 'delete') {
      ok = await deleteQuote(targetQuote.value.id)
      if (ok) triggerToast('Devis supprimé', `Le devis "${targetQuote.value.number}" a été supprimé.`)
    }

    if (ok) {
      showConfirmModal.value = false
      await loadQuotes()
    }
  } finally {
    actionLoading.value = false
  }
}

function triggerToast(title: string, message: string, type: 'success' | 'error' = 'success') {
  toastTitle.value = title
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
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
