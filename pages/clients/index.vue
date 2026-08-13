<template>
  <div class="space-y-6">
    <!-- Page Header & Action Button -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-100 tracking-tight">Clients</h2>
        <p class="text-xs text-slate-400 mt-1">Gérez le répertoire des clients entreprises et particuliers d'Atlas Bites SARL.</p>
      </div>

      <NuxtLink
        to="/clients/new"
        class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nouveau client</span>
      </NuxtLink>
    </div>

    <!-- Filters Section -->
    <ClientFilters
      :search="queryFilters.search"
      :type="queryFilters.type"
      :city="queryFilters.city"
      :status="queryFilters.status"
      @update:filters="handleFilterUpdate"
    />

    <!-- Error Display -->
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
        @click="loadClients"
        class="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg font-semibold text-[11px] transition-colors"
      >
        Réessayer
      </button>
    </div>

    <!-- Main Table Container -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
      <!-- Loading State Overlay -->
      <div v-if="loading && clients.length === 0" class="p-12 text-center text-slate-400">
        <svg class="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-xs">Chargement de la liste des clients...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading && clients.length === 0" class="p-12 text-center space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-slate-200">Aucun client trouvé</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          {{ queryFilters.search || queryFilters.type || queryFilters.city ? 'Aucun client ne correspond aux critères de recherche.' : 'Aucun client enregistré pour le moment.' }}
        </p>
        <div class="pt-2">
          <NuxtLink
            to="/clients/new"
            class="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Créer le premier client</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Clients Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold">
              <th class="py-3.5 px-4">Client</th>
              <th class="py-3.5 px-4">Type</th>
              <th class="py-3.5 px-4">ICE / IF</th>
              <th class="py-3.5 px-4">Contact</th>
              <th class="py-3.5 px-4">Ville</th>
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4">Création</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="client in clients"
              :key="client.id"
              class="hover:bg-slate-800/30 transition-colors"
              :class="{ 'opacity-60 bg-slate-950/40': client.isArchived }"
            >
              <!-- Name & Company -->
              <td class="py-3.5 px-4">
                <NuxtLink :to="`/clients/${client.id}`" class="font-bold text-slate-100 hover:text-amber-400 transition-colors block">
                  {{ client.displayName }}
                </NuxtLink>
                <span v-if="client.type === 'COMPANY' && client.contactName" class="text-[11px] text-slate-400 block truncate">
                  Contact: {{ client.contactName }}
                </span>
              </td>

              <!-- Type Badge -->
              <td class="py-3.5 px-4">
                <ClientTypeBadge :type="client.type" />
              </td>

              <!-- ICE / TaxId -->
              <td class="py-3.5 px-4 font-mono text-slate-300">
                <div v-if="client.ice" class="text-xs">ICE: {{ client.ice }}</div>
                <div v-if="client.taxId" class="text-[11px] text-slate-400">IF: {{ client.taxId }}</div>
                <span v-if="!client.ice && !client.taxId" class="text-slate-500">—</span>
              </td>

              <!-- Phone & Email -->
              <td class="py-3.5 px-4 text-slate-300">
                <div v-if="client.phone" class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h32a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                  </svg>
                  <span>{{ client.phone }}</span>
                </div>
                <div v-if="client.email" class="text-[11px] text-slate-400 truncate max-w-[160px]">
                  {{ client.email }}
                </div>
                <span v-if="!client.phone && !client.email" class="text-slate-500">—</span>
              </td>

              <!-- City -->
              <td class="py-3.5 px-4 text-slate-300">
                {{ client.city || '—' }}
              </td>

              <!-- Status Badge -->
              <td class="py-3.5 px-4">
                <ClientStatusBadge :is-archived="client.isArchived" />
              </td>

              <!-- Created At -->
              <td class="py-3.5 px-4 text-slate-400 text-[11px]">
                {{ formatDate(client.createdAt) }}
              </td>

              <!-- Actions Dropdown / Buttons -->
              <td class="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                <NuxtLink
                  :to="`/clients/${client.id}`"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Voir la fiche"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </NuxtLink>

                <NuxtLink
                  :to="`/clients/${client.id}/edit`"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </NuxtLink>

                <!-- Archive / Restore (SUPER_ADMIN & ACCOUNTANT) -->
                <button
                  v-if="canArchiveRestore"
                  @click="openArchiveModal(client)"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                  :title="client.isArchived ? 'Restaurer' : 'Archiver'"
                >
                  <svg v-if="!client.isArchived" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8zm14 0l-4-4H9L5 8" />
                  </svg>
                  <svg v-else class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                <!-- Permanent Delete (SUPER_ADMIN ONLY) -->
                <button
                  v-if="canDelete"
                  @click="openDeleteModal(client)"
                  class="p-1.5 inline-flex items-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Supprimer définitivement"
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

      <!-- Pagination Container -->
      <div v-if="clients.length > 0" class="p-4 bg-slate-950/40">
        <Pagination
          :page="pagination.page"
          :page-size="pagination.pageSize"
          :total-items="pagination.totalItems"
          :total-pages="pagination.totalPages"
          @change-page="handlePageChange"
        />
      </div>
    </div>

    <!-- Confirm Dialog Modals -->
    <ConfirmDialog
      :show="showConfirmModal"
      :title="confirmModalTitle"
      :message="confirmModalMessage"
      :confirm-text="confirmModalButtonText"
      :danger="modalActionType === 'delete'"
      :loading="actionLoading"
      :require-match-text="modalActionType === 'delete' ? targetClient?.displayName : undefined"
      @confirm="executeClientAction"
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
import ClientFilters from '~/components/clients/ClientFilters.vue'
import ClientTypeBadge from '~/components/clients/ClientTypeBadge.vue'
import ClientStatusBadge from '~/components/clients/ClientStatusBadge.vue'
import Pagination from '~/components/ui/Pagination.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import NotificationToast from '~/components/ui/NotificationToast.vue'
import type { ClientType } from '@prisma/client'
import type { ClientWithUser } from '~/composables/useClients'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { clients, pagination, loading, error, fetchClients, archiveClient, restoreClient, deleteClient } = useClients()

const canArchiveRestore = computed(() => ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user.value?.role || ''))
const canDelete = computed(() => user.value?.role === 'SUPER_ADMIN')

const queryFilters = reactive<{
  search?: string
  type?: ClientType
  city?: string
  status: 'active' | 'archived' | 'all'
  page: number
}>({
  search: (route.query.search as string) || undefined,
  type: (route.query.type as ClientType) || undefined,
  city: (route.query.city as string) || undefined,
  status: (route.query.status as 'active' | 'archived' | 'all') || 'active',
  page: route.query.page ? parseInt(route.query.page as string, 10) : 1
})

// Modal states
const showConfirmModal = ref(false)
const targetClient = ref<ClientWithUser | null>(null)
const modalActionType = ref<'archive' | 'restore' | 'delete'>('archive')
const actionLoading = ref(false)

// Toast states
const showToast = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

const confirmModalTitle = computed(() => {
  if (modalActionType.value === 'delete') return 'Supprimer définitivement le client'
  if (modalActionType.value === 'archive') return 'Archiver le client'
  return 'Restaurer le client'
})

const confirmModalMessage = computed(() => {
  if (!targetClient.value) return ''
  if (modalActionType.value === 'delete') {
    return `Êtes-vous sûr de vouloir supprimer définitivement "${targetClient.value.displayName}" ? Cette action est irréversible et supprimera l'ensemble de ses informations.`
  }
  if (modalActionType.value === 'archive') {
    return `Voulez-vous archiver le client "${targetClient.value.displayName}" ? Il sera masqué de la liste des clients actifs.`
  }
  return `Voulez-vous restaurer le client "${targetClient.value.displayName}" dans la liste des clients actifs ?`
})

const confirmModalButtonText = computed(() => {
  if (modalActionType.value === 'delete') return 'Supprimer définitivement'
  if (modalActionType.value === 'archive') return 'Archiver le client'
  return 'Restaurer le client'
})

async function loadClients() {
  await fetchClients({
    search: queryFilters.search,
    type: queryFilters.type,
    city: queryFilters.city,
    status: queryFilters.status,
    page: queryFilters.page
  })
}

function handleFilterUpdate(filters: { search?: string; type?: ClientType; city?: string; status?: 'active' | 'archived' | 'all' }) {
  queryFilters.search = filters.search
  queryFilters.type = filters.type
  queryFilters.city = filters.city
  queryFilters.status = filters.status || 'active'
  queryFilters.page = 1

  syncUrlQuery()
  loadClients()
}

function handlePageChange(newPage: number) {
  queryFilters.page = newPage
  syncUrlQuery()
  loadClients()
}

function syncUrlQuery() {
  router.push({
    query: {
      search: queryFilters.search || undefined,
      type: queryFilters.type || undefined,
      city: queryFilters.city || undefined,
      status: queryFilters.status !== 'active' ? queryFilters.status : undefined,
      page: queryFilters.page > 1 ? queryFilters.page : undefined
    }
  })
}

function openArchiveModal(client: ClientWithUser) {
  targetClient.value = client
  modalActionType.value = client.isArchived ? 'restore' : 'archive'
  showConfirmModal.value = true
}

function openDeleteModal(client: ClientWithUser) {
  targetClient.value = client
  modalActionType.value = 'delete'
  showConfirmModal.value = true
}

async function executeClientAction() {
  if (!targetClient.value) return
  actionLoading.value = true

  try {
    let ok = false
    if (modalActionType.value === 'archive') {
      ok = await archiveClient(targetClient.value.id)
      if (ok) triggerToast('Client archivé', `Le client "${targetClient.value.displayName}" a été archivé avec succès.`)
    } else if (modalActionType.value === 'restore') {
      ok = await restoreClient(targetClient.value.id)
      if (ok) triggerToast('Client restauré', `Le client "${targetClient.value.displayName}" est à nouveau actif.`)
    } else if (modalActionType.value === 'delete') {
      ok = await deleteClient(targetClient.value.id)
      if (ok) triggerToast('Client supprimé', `Le client "${targetClient.value.displayName}" a été supprimé définitivement.`)
    }

    if (ok) {
      showConfirmModal.value = false
      await loadClients()
    } else {
      triggerToast('Erreur', error.value || 'Action échouée', 'error')
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

onMounted(() => {
  loadClients()
})
</script>
