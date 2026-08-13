<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Top Back Link -->
    <div>
      <NuxtLink to="/clients" class="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Retour au répertoire des clients</span>
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !client" class="p-12 text-center text-slate-400">
      <svg class="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs">Chargement de la fiche client...</p>
    </div>

    <!-- Client Not Found Error -->
    <div v-else-if="!client" class="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-100">Client introuvable</h3>
      <p class="text-xs text-slate-400">Ce client n'existe pas ou a été supprimé.</p>
      <NuxtLink to="/clients" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold">
        Retour aux clients
      </NuxtLink>
    </div>

    <!-- Main Client Profile Card -->
    <template v-else>
      <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <!-- Header Info & Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">
                {{ client.displayName }}
              </h2>
              <ClientTypeBadge :type="client.type" />
              <ClientStatusBadge :is-archived="client.isArchived" />
            </div>

            <p v-if="client.type === 'COMPANY' && client.companyName" class="text-xs text-slate-400">
              Raison sociale : <strong class="text-slate-200">{{ client.companyName }}</strong>
            </p>
            <p v-else-if="client.firstName || client.lastName" class="text-xs text-slate-400">
              Nom complet : <strong class="text-slate-200">{{ client.firstName }} {{ client.lastName }}</strong>
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-2 flex-wrap">
            <NuxtLink
              :to="`/clients/${client.id}/edit`"
              class="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Modifier</span>
            </NuxtLink>

            <button
              v-if="canArchiveRestore"
              @click="openArchiveModal"
              class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg v-if="!client.isArchived" class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8zm14 0l-4-4H9L5 8" />
              </svg>
              <svg v-else class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{{ client.isArchived ? 'Restaurer' : 'Archiver' }}</span>
            </button>

            <button
              v-if="canDelete"
              @click="openDeleteModal"
              class="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Supprimer</span>
            </button>
          </div>
        </div>

        <!-- Informations Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Coordonnées -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Coordonnées & Localisation
            </h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Email principal</span>
                <span class="text-slate-100 font-medium">{{ client.email || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Téléphone principal</span>
                <span class="text-slate-100 font-medium">{{ client.phone || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Téléphone secondaire</span>
                <span class="text-slate-100 font-medium">{{ client.secondaryPhone || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Ville</span>
                <span class="text-slate-100 font-medium">{{ client.city || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Code postal</span>
                <span class="text-slate-100 font-medium">{{ client.postalCode || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Adresse</span>
                <span class="text-slate-100 font-medium text-right">{{ client.address || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Pays</span>
                <span class="text-slate-100 font-medium">{{ client.country }}</span>
              </div>
            </div>
          </div>

          <!-- Informations Fiscales (Entreprise) -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Identifiants Fiscaux & Légaux
            </h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">ICE (15 chiffres)</span>
                <span class="text-slate-100 font-mono font-medium">{{ client.ice || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Identifiant Fiscal (IF)</span>
                <span class="text-slate-100 font-mono font-medium">{{ client.taxId || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Registre du Commerce (RC)</span>
                <span class="text-slate-100 font-medium">{{ client.rc || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">N° CNSS</span>
                <span class="text-slate-100 font-medium">{{ client.cnss || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Patente</span>
                <span class="text-slate-100 font-medium">{{ client.patent || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Personne de Contact -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Personne de Contact
            </h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Nom du contact</span>
                <span class="text-slate-100 font-medium">{{ client.contactName || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Poste / Fonction</span>
                <span class="text-slate-100 font-medium">{{ client.contactPosition || '—' }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Email contact</span>
                <span class="text-slate-100 font-medium">{{ client.contactEmail || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Téléphone contact</span>
                <span class="text-slate-100 font-medium">{{ client.contactPhone || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Notes Internes -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Notes Internes Traiteur
            </h3>
            <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {{ client.notes || 'Aucune note interne saisie.' }}
            </p>
          </div>
        </div>

        <!-- Metadata Section -->
        <div class="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
          <div>
            Créé le <span class="text-slate-200 font-medium">{{ formatDate(client.createdAt) }}</span>
            <span v-if="client.createdBy"> par <strong class="text-slate-200">{{ client.createdBy.name }}</strong></span>
          </div>
          <div v-if="client.updatedAt">
            Dernière modification le <span class="text-slate-200 font-medium">{{ formatDate(client.updatedAt) }}</span>
            <span v-if="client.updatedBy"> par <strong class="text-slate-200">{{ client.updatedBy.name }}</strong></span>
          </div>
        </div>
      </div>

      <!-- Future Placeholders Section (Devis & Factures) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <!-- Devis Placeholder -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
          <div class="flex items-center justify-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Devis Traiteur
          </div>
          <p class="text-xs text-slate-500">Aucun devis pour le moment</p>
        </div>

        <!-- Factures Placeholder -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
          <div class="flex items-center justify-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Factures
          </div>
          <p class="text-xs text-slate-500">Aucune facture pour le moment</p>
        </div>
      </div>

      <!-- Action Confirmation Dialog -->
      <ConfirmDialog
        :show="showConfirmModal"
        :title="confirmModalTitle"
        :message="confirmModalMessage"
        :confirm-text="confirmModalButtonText"
        :danger="modalActionType === 'delete'"
        :loading="actionLoading"
        :require-match-text="modalActionType === 'delete' ? client.displayName : undefined"
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
    </template>
  </div>
</template>

<script setup lang="ts">
import ClientTypeBadge from '~/components/clients/ClientTypeBadge.vue'
import ClientStatusBadge from '~/components/clients/ClientStatusBadge.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import NotificationToast from '~/components/ui/NotificationToast.vue'
import type { ClientWithUser } from '~/composables/useClients'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { fetchClient, archiveClient, restoreClient, deleteClient } = useClients()

const client = ref<ClientWithUser | null>(null)
const loading = ref(true)

const canArchiveRestore = computed(() => ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user.value?.role || ''))
const canDelete = computed(() => user.value?.role === 'SUPER_ADMIN')

// Modal states
const showConfirmModal = ref(false)
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
  if (!client.value) return ''
  if (modalActionType.value === 'delete') {
    return `Êtes-vous sûr de vouloir supprimer définitivement "${client.value.displayName}" ? Cette action est irréversible.`
  }
  if (modalActionType.value === 'archive') {
    return `Voulez-vous archiver le client "${client.value.displayName}" ?`
  }
  return `Voulez-vous restaurer le client "${client.value.displayName}" dans la liste des clients actifs ?`
})

const confirmModalButtonText = computed(() => {
  if (modalActionType.value === 'delete') return 'Supprimer définitivement'
  if (modalActionType.value === 'archive') return 'Archiver'
  return 'Restaurer'
})

async function loadClientData() {
  const id = route.params.id as string
  if (id) {
    loading.value = true
    client.value = await fetchClient(id)
    loading.value = false
  }
}

function openArchiveModal() {
  if (!client.value) return
  modalActionType.value = client.value.isArchived ? 'restore' : 'archive'
  showConfirmModal.value = true
}

function openDeleteModal() {
  if (!client.value) return
  modalActionType.value = 'delete'
  showConfirmModal.value = true
}

async function executeClientAction() {
  if (!client.value) return
  actionLoading.value = true

  try {
    let ok = false
    if (modalActionType.value === 'archive') {
      ok = await archiveClient(client.value.id)
      if (ok) triggerToast('Client archivé', `Le client "${client.value.displayName}" a été archivé.`)
    } else if (modalActionType.value === 'restore') {
      ok = await restoreClient(client.value.id)
      if (ok) triggerToast('Client restauré', `Le client "${client.value.displayName}" est à nouveau actif.`)
    } else if (modalActionType.value === 'delete') {
      ok = await deleteClient(client.value.id)
      if (ok) {
        triggerToast('Client supprimé', `Le client "${client.value.displayName}" a été supprimé.`)
        await router.push('/clients')
        return
      }
    }

    if (ok) {
      showConfirmModal.value = false
      await loadClientData()
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

await useAsyncData(`client-detail-${route.params.id}`, () => loadClientData())
</script>
