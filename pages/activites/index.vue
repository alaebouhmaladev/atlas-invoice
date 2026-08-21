<template>
  <div class="space-y-6">
    <!-- Header Controls & Filters -->
    <div class="bg-panel border border-custom rounded-panel p-4 sm:p-5 shadow-soft space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-custom pb-4">
        <div>
          <h2 class="text-base font-extrabold text-main flex items-center gap-2">
            <svg class="w-5 h-5 text-[#987d61] dark:text-[#d0baa0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Journal de sécurité & d'activités
          </h2>
          <p class="text-xs text-muted-custom mt-0.5">
            Traçabilité immuable des actions utilisateurs et événements système.
          </p>
        </div>

        <button
          @click="fetchLogs"
          :disabled="loading"
          class="px-3.5 py-1.5 bg-panel-raised hover:bg-surface-hover text-main rounded-pill text-xs font-bold border border-custom transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <svg class="w-4 h-4 text-muted-custom" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser
        </button>
      </div>

      <!-- Filters Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <!-- Search Input -->
        <div>
          <label class="block font-bold text-muted-custom uppercase tracking-wider text-[11px] mb-1">Recherche</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="N° document, utilisateur..."
            @input="debouncedFetch"
            class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-main placeholder-muted-custom focus:outline-none focus:border-brand"
          />
        </div>

        <!-- Category Dropdown -->
        <div>
          <label class="block font-bold text-muted-custom uppercase tracking-wider text-[11px] mb-1">Catégorie</label>
          <select
            v-model="filters.category"
            @change="fetchLogs"
            class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-main focus:outline-none focus:border-brand"
          >
            <option value="">Toutes les catégories</option>
            <option value="AUTH">Authentification</option>
            <option value="CLIENT">Clients</option>
            <option value="DEVIS">Devis</option>
            <option value="FACTURE">Factures</option>
            <option value="PAYMENT">Paiements</option>
            <option value="SETTINGS">Paramètres</option>
            <option value="SYSTEM">Système & Sauvegarde</option>
            <option value="USER">Utilisateurs</option>
          </select>
        </div>

        <!-- Result Dropdown -->
        <div>
          <label class="block font-bold text-muted-custom uppercase tracking-wider text-[11px] mb-1">Résultat</label>
          <select
            v-model="filters.result"
            @change="fetchLogs"
            class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-main focus:outline-none focus:border-brand"
          >
            <option value="">Tous les résultats</option>
            <option value="SUCCESS">Succès uniquement</option>
            <option value="FAILURE">Échecs uniquement</option>
          </select>
        </div>

        <!-- Role Dropdown -->
        <div>
          <label class="block font-bold text-muted-custom uppercase tracking-wider text-[11px] mb-1">Rôle</label>
          <select
            v-model="filters.role"
            @change="fetchLogs"
            class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-main focus:outline-none focus:border-brand"
          >
            <option value="">Tous les rôles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ACCOUNTANT">Comptable</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Activity Data Table -->
    <div class="bg-panel border border-custom rounded-panel shadow-soft overflow-hidden">
      <div v-if="loading && logs.length === 0" class="p-12 text-center text-xs text-muted-custom flex flex-col items-center gap-2 font-bold">
        <svg class="animate-spin h-6 w-6 text-[#b49c80]" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Chargement des activités...
      </div>

      <div v-else-if="logs.length === 0" class="p-12 text-center text-xs text-muted-custom">
        Aucune activité trouvée correspondant aux critères.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-panel-raised border-b border-custom text-muted-custom font-bold uppercase tracking-wider text-[10px]">
              <th class="py-3 px-4">Horodatage</th>
              <th class="py-3 px-4">Utilisateur</th>
              <th class="py-3 px-4">Catégorie & Action</th>
              <th class="py-3 px-4">Référence</th>
              <th class="py-3 px-4">Résultat</th>
              <th class="py-3 px-4 text-right">Détails</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom">
            <tr
              v-for="log in logs"
              :key="log.id"
              class="hover:bg-surface-hover transition-colors"
            >
              <!-- Horodatage -->
              <td class="py-3 px-4 text-secondary-custom font-mono whitespace-nowrap">
                {{ formatDate(log.createdAt) }}
              </td>

              <!-- Utilisateur -->
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="font-bold text-main">
                  {{ log.actorDisplayNameSnapshot || log.user?.name || 'Système' }}
                </div>
                <div v-if="log.actorRoleSnapshot || log.user?.role" class="text-[10px] text-muted-custom">
                  {{ formatRole(log.actorRoleSnapshot || log.user?.role) }}
                </div>
              </td>

              <!-- Catégorie & Action -->
              <td class="py-3 px-4">
                <span class="inline-block px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase border mb-1" :class="getCategoryBadgeClass(log.category)">
                  {{ log.category }}
                </span>
                <div class="text-main font-bold truncate max-w-xs">
                  {{ formatActionLabel(log.action) }}
                </div>
              </td>

              <!-- Référence -->
              <td class="py-3 px-4 whitespace-nowrap">
                <NuxtLink
                  v-if="log.entityReference && getEntityUrl(log.entityType, log.entityId)"
                  :to="getEntityUrl(log.entityType, log.entityId)"
                  class="text-[#987d61] dark:text-[#d0baa0] hover:underline font-bold"
                >
                  {{ log.entityReference }}
                </NuxtLink>
                <span v-else-if="log.entityReference" class="text-main font-mono">
                  {{ log.entityReference }}
                </span>
                <span v-else class="text-muted-custom">-</span>
              </td>

              <!-- Résultat -->
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  class="px-2.5 py-0.5 rounded-pill text-[10px] font-bold uppercase border"
                  :class="log.result === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'"
                >
                  {{ log.result === 'SUCCESS' ? 'Succès' : 'Échec' }}
                </span>
              </td>

              <!-- Action Details -->
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <button
                  @click="openDetails(log)"
                  class="px-2.5 py-1 bg-panel-raised hover:bg-surface-hover text-main rounded-control text-xs font-bold border border-custom transition-colors cursor-pointer"
                >
                  Inspecter
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="p-4 border-t border-custom flex items-center justify-between text-xs">
        <span class="text-muted-custom">
          Page <strong class="text-main font-mono">{{ pagination.page }}</strong> sur <strong class="text-main font-mono">{{ pagination.totalPages }}</strong> ({{ pagination.total }} entrées)
        </span>
        <div class="flex items-center gap-2">
          <button
            @click="changePage(pagination.page - 1)"
            :disabled="pagination.page <= 1 || loading"
            class="px-3 py-1.5 bg-panel-raised hover:bg-surface-hover text-main rounded-control border border-custom disabled:opacity-50 cursor-pointer font-bold"
          >
            Précédent
          </button>
          <button
            @click="changePage(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages || loading"
            class="px-3 py-1.5 bg-panel-raised hover:bg-surface-hover text-main rounded-control border border-custom disabled:opacity-50 cursor-pointer font-bold"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>

    <!-- Slide-over Drawer for Log Metadata Inspection -->
    <Teleport to="body">
      <div v-if="selectedLog" class="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
        <div class="w-full max-w-lg bg-panel border-l border-custom p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-custom pb-3">
              <h3 class="text-sm font-bold text-main flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-[#b49c80]"></span>
                Détails de l'activité
              </h3>
              <button @click="selectedLog = null" class="text-muted-custom hover:text-main p-1 cursor-pointer">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Detail Grid -->
            <div class="space-y-3 text-xs">
              <div>
                <span class="text-muted-custom block">Action :</span>
                <strong class="text-[#987d61] dark:text-[#d0baa0] font-mono">{{ selectedLog.action }}</strong>
              </div>
              <div>
                <span class="text-muted-custom block">Horodatage :</span>
                <span class="text-main font-mono">{{ formatDate(selectedLog.createdAt) }}</span>
              </div>
              <div>
                <span class="text-muted-custom block">Identifiant de requête (Request ID) :</span>
                <span class="font-mono text-main bg-panel-raised px-2 py-0.5 rounded-control border border-custom inline-block mt-0.5">
                  {{ selectedLog.requestId || 'Non disponible' }}
                </span>
              </div>
              <div>
                <span class="text-muted-custom block">Adresse IP / User-Agent :</span>
                <span class="text-main block font-mono text-[11px] mt-0.5 break-all">
                  IP: {{ selectedLog.ipAddress || 'Interne' }}
                </span>
                <span class="text-muted-custom block text-[10px] mt-0.5 break-all">
                  {{ selectedLog.userAgent || '-' }}
                </span>
              </div>

              <!-- Sanitized Metadata -->
              <div v-if="selectedLog.metadata" class="pt-2">
                <span class="text-muted-custom font-bold block mb-1">Métadonnées sécurisées :</span>
                <pre class="bg-panel-raised p-3 rounded-card border border-custom text-[11px] font-mono text-emerald-600 dark:text-emerald-400 overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
              </div>

              <!-- Diffs -->
              <div v-if="selectedLog.changedFields" class="pt-2">
                <span class="text-muted-custom font-bold block mb-1">Modifications apportées :</span>
                <pre class="bg-panel-raised p-3 rounded-card border border-custom text-[11px] font-mono text-[#987d61] dark:text-[#d0baa0] overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(selectedLog.changedFields, null, 2) }}</pre>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-custom flex justify-end">
            <button
              @click="selectedLog = null"
              class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main rounded-control text-xs font-bold border border-custom transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

definePageMeta({
  middleware: ['auth'],
  layout: 'default'
})

const loading = ref(false)
const logs = ref<any[]>([])
const selectedLog = ref<any>(null)

const filters = reactive({
  search: '',
  category: '',
  result: '',
  role: '',
  page: 1
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debouncedFetch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    filters.page = 1
    fetchLogs()
  }, 300)
}

async function fetchLogs() {
  loading.value = true
  try {
    const queryParams: Record<string, string> = {
      page: String(filters.page),
      limit: '20'
    }
    if (filters.search) queryParams.search = filters.search
    if (filters.category) queryParams.category = filters.category
    if (filters.result) queryParams.result = filters.result
    if (filters.role) queryParams.role = filters.role

    const res: any = await $fetch('/api/admin/audit/logs', { query: queryParams })
    if (res?.success) {
      logs.value = res.data.logs || []
      pagination.page = res.data.pagination.page
      pagination.total = res.data.pagination.total
      pagination.totalPages = res.data.pagination.totalPages
    }
  } catch (err) {
    console.error('Failed to fetch audit logs:', err)
  } finally {
    loading.value = false
  }
}

function changePage(newPage: number) {
  if (newPage >= 1 && newPage <= pagination.totalPages) {
    filters.page = newPage
    fetchLogs()
  }
}

function openDetails(log: any) {
  selectedLog.value = log
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatRole(role?: string): string {
  if (role === 'SUPER_ADMIN') return 'Super Admin'
  if (role === 'ACCOUNTANT') return 'Comptable'
  if (role === 'COMMERCIAL') return 'Commercial'
  return role || 'Utilisateur'
}

function formatActionLabel(action: string): string {
  const map: Record<string, string> = {
    AUTH_LOGIN_SUCCESS: 'Connexion réussie',
    AUTH_LOGIN_FAILED: 'Échec de connexion',
    AUTH_LOGIN_RATE_LIMITED: 'Tentatives excessives (Rate Limit)',
    AUTH_LOGIN_REJECTED_INACTIVE: 'Connexion refusée (compte désactivé)',
    CLIENT_CREATED: 'Création d’un client',
    CLIENT_UPDATED: 'Modification d’un client',
    CLIENT_ARCHIVED: 'Archivage d’un client',
    QUOTE_CREATED: 'Création d’un devis',
    QUOTE_UPDATED: 'Modification d’un devis',
    QUOTE_CONVERTED: 'Conversion d’un devis en facture',
    INVOICE_CREATED: 'Création d’une facture',
    INVOICE_FINALIZED: 'Finalisation d’une facture',
    INVOICE_CANCELLED: 'Annulation d’une facture',
    PAYMENT_CREATED: 'Enregistrement d’un paiement',
    PAYMENT_REVERSED: 'Annulation d’un paiement',
    COMPANY_SETTINGS_UPDATED: 'Modification des paramètres de la société',
    COMPANY_ASSET_UPLOADED: 'Mise à jour d’un visuel d’entreprise',
    USER_CREATED: 'Création d’un utilisateur',
    USER_UPDATED: 'Modification d’un utilisateur',
    USER_DEACTIVATED: 'Désactivation d’un utilisateur',
    USER_ACTIVATED: 'Réactivation d’un utilisateur',
    BULK_DOCUMENT_ARCHIVE: 'Archivage groupé de documents',
    BULK_DRAFT_DELETE: 'Suppression groupée de brouillons',
    BULK_MIXED_CLEANUP: 'Nettoyage groupé de documents',
    BULK_DOCUMENT_RESTORE: 'Restauration groupée de documents',
    UNAUTHORIZED_BULK_ACTION_ATTEMPT: 'Tentative d’action groupée non autorisée'
  }
  return map[action] || action
}

function getCategoryBadgeClass(category: string): string {
  switch (category) {
    case 'AUTH':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
    case 'FACTURE':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    case 'DEVIS':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    case 'PAYMENT':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'SETTINGS':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
    case 'USER':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    default:
      return 'bg-panel-raised text-muted-custom border-custom'
  }
}

function getEntityUrl(entityType?: string, entityId?: string): string | undefined {
  if (!entityType || !entityId) return undefined
  if (entityType === 'Invoice') return `/factures/${entityId}`
  if (entityType === 'Quote') return `/devis/${entityId}`
  if (entityType === 'Client') return `/clients/${entityId}`
  return undefined
}

onMounted(() => {
  fetchLogs()
})
</script>
