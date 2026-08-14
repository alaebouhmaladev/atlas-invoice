<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Top Back Link -->
    <div>
      <NuxtLink to="/devis" class="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Retour aux devis</span>
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !quote" class="p-12 text-center text-slate-400">
      <svg class="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs">Chargement du devis...</p>
    </div>

    <!-- Devis Not Found Error -->
    <div v-else-if="!quote" class="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
      <h3 class="text-base font-bold text-slate-100">Devis introuvable</h3>
      <NuxtLink to="/devis" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold">
        Retour à la liste des devis
      </NuxtLink>
    </div>

    <!-- Main Devis Profile Card -->
    <template v-else>
      <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <!-- Header Info & Action Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div class="space-y-1.5">
            <div class="flex items-center gap-3">
              <h2 class="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
                {{ quote.number }}
              </h2>
              <QuoteStatusBadge :status="quote.status" />
              <ClientStatusBadge v-if="quote.isArchived" :is-archived="true" />
            </div>

            <p v-if="quote.subject" class="text-sm font-semibold text-slate-200">
              Objet : {{ quote.subject }}
            </p>
          </div>

          <!-- Actions Bar Component -->
          <QuoteStatusActions
            :quote="quote"
            :loading="actionLoading"
            :can-archive-restore="canArchiveRestore"
            :can-delete="canDelete"
            :can-convert-to-invoice="canConvertToInvoice"
            @change-status="handleStatusChange"
            @duplicate="handleDuplicate"
            @archive-restore="openArchiveModal"
            @delete="openDeleteModal"
            @download-pdf="downloadPdf(quote.id, quote.number)"
            @convert-to-invoice="handleConvertToInvoice"
          />
        </div>

        <!-- Devis Header Cards Grid (Client Snapshot & Document Info) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Client Snapshot Box -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Client (Informations Figées)</span>
              <NuxtLink v-if="quote.clientId" :to="`/clients/${quote.clientId}`" class="text-[11px] text-slate-400 hover:text-white font-normal underline">
                Fiche client actuelle
              </NuxtLink>
            </h3>

            <div class="space-y-2 text-xs">
              <div class="text-sm font-bold text-slate-100">{{ quote.clientSnapshot?.displayName }}</div>
              <div v-if="quote.clientSnapshot?.ice" class="font-mono text-slate-300">ICE: {{ quote.clientSnapshot.ice }}</div>
              <div v-if="quote.clientSnapshot?.taxId" class="font-mono text-slate-400">IF: {{ quote.clientSnapshot.taxId }}</div>
              <div v-if="quote.clientSnapshot?.address" class="text-slate-300">
                {{ quote.clientSnapshot.address }} {{ quote.clientSnapshot.city ? `, ${quote.clientSnapshot.city}` : '' }}
              </div>
              <div v-if="quote.clientSnapshot?.phone || quote.clientSnapshot?.email" class="text-slate-400 text-[11px]">
                {{ quote.clientSnapshot.phone }} • {{ quote.clientSnapshot.email }}
              </div>
            </div>
          </div>

          <!-- Document Dates & Details -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Détails du Document
            </h3>

            <div class="space-y-2 text-xs">
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Date d'émission</span>
                <span class="text-slate-100 font-medium">{{ formatDate(quote.issueDate) }}</span>
              </div>

              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Date de validité</span>
                <span class="font-medium" :class="isExpiredDate(quote.validUntil) && quote.status === 'SENT' ? 'text-rose-400 font-bold' : 'text-slate-100'">
                  {{ formatDate(quote.validUntil) }}
                </span>
              </div>

              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Devise</span>
                <span class="text-slate-100 font-medium font-mono">MAD</span>
              </div>

              <div class="flex justify-between">
                <span class="text-slate-400">Conditions de paiement</span>
                <span class="text-slate-100 font-medium text-right max-w-[200px]">{{ quote.paymentTerms || 'Standard' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Service Lines Table -->
        <div class="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div class="p-4 bg-slate-950/80 border-b border-slate-800 text-xs font-bold text-slate-200 uppercase tracking-wider">
            Prestations Traiteur ({{ quote.items?.length || 0 }} lignes)
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold">
                  <th class="py-3 px-4">#</th>
                  <th class="py-3 px-4">Désignation & Description</th>
                  <th class="py-3 px-4 text-right">Quantité</th>
                  <th class="py-3 px-4 text-center">Unité</th>
                  <th class="py-3 px-4 text-right">P.U. HT</th>
                  <th class="py-3 px-4 text-right">Remise</th>
                  <th class="py-3 px-4 text-right">TVA</th>
                  <th class="py-3 px-4 text-right">Total HT (MAD)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr v-for="item in quote.items" :key="item.id" class="hover:bg-slate-800/30 transition-colors">
                  <td class="py-3 px-4 text-slate-500 font-mono">{{ item.position }}</td>
                  <td class="py-3 px-4">
                    <span class="font-bold text-slate-100 block">{{ item.title }}</span>
                    <span v-if="item.description" class="text-[11px] text-slate-400 block mt-0.5 whitespace-pre-line">{{ item.description }}</span>
                  </td>
                  <td class="py-3 px-4 text-right font-mono text-slate-200">{{ Number(item.quantity) }}</td>
                  <td class="py-3 px-4 text-center text-slate-300">{{ item.unit }}</td>
                  <td class="py-3 px-4 text-right font-mono text-slate-200">{{ formatMoney(item.unitPriceHt).replace(' MAD', '') }}</td>
                  <td class="py-3 px-4 text-right font-mono text-amber-400">
                    {{ Number(item.discountRate) > 0 ? `${Number(item.discountRate)}%` : '—' }}
                  </td>
                  <td class="py-3 px-4 text-right font-mono text-slate-300">{{ Number(item.vatRate) }}%</td>
                  <td class="py-3 px-4 text-right font-mono font-bold text-slate-100">{{ formatMoney(item.netAmountHt).replace(' MAD', '') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totals & Notes Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Notes -->
          <div class="space-y-4">
            <div v-if="quote.publicNotes" class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-2">
              <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider">Notes visibles sur le devis (PDF)</h3>
              <p class="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{{ quote.publicNotes }}</p>
            </div>

            <div v-if="quote.internalNotes" class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-2">
              <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Notes Internes Confidentielles</span>
              </h3>
              <p class="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{{ quote.internalNotes }}</p>
            </div>
          </div>

          <!-- Financial Summary Totals Block -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2">
              Récapitulatif Financier (MAD)
            </h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between text-slate-400">
                <span>Sous-total HT :</span>
                <span class="font-mono text-slate-200">{{ formatMoney(quote.subtotalHt) }}</span>
              </div>
              <div v-if="Number(quote.discountAmount) > 0" class="flex justify-between text-amber-400">
                <span>Total Remises :</span>
                <span class="font-mono">- {{ formatMoney(quote.discountAmount) }}</span>
              </div>
              <div class="flex justify-between text-slate-200 font-semibold border-t border-slate-800/80 pt-2">
                <span>Total Net HT :</span>
                <span class="font-mono">{{ formatMoney(quote.totalNetHt) }}</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>TVA Total :</span>
                <span class="font-mono text-slate-200">{{ formatMoney(quote.totalVat) }}</span>
              </div>
              <div class="flex justify-between items-center bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 p-3 rounded-xl text-amber-400 font-bold text-sm mt-3">
                <span>Total TTC :</span>
                <span class="font-mono text-lg">{{ formatMoney(quote.totalTtc) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Timestamps Metadata Box -->
        <div class="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            Créé le <span class="text-slate-200 font-medium">{{ formatDate(quote.createdAt) }}</span>
            <span v-if="quote.createdBy"> par <strong class="text-slate-200">{{ quote.createdBy.name }}</strong></span>
          </div>

          <div class="flex items-center gap-3">
            <span v-if="quote.sentAt">Envoyé le: {{ formatDate(quote.sentAt) }}</span>
            <span v-if="quote.acceptedAt" class="text-emerald-400 font-semibold">Accepté le: {{ formatDate(quote.acceptedAt) }}</span>
            <span v-if="quote.rejectedAt" class="text-rose-400">Refusé le: {{ formatDate(quote.rejectedAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Confirmation Dialog -->
      <ConfirmDialog
        :show="showConfirmModal"
        :title="confirmModalTitle"
        :message="confirmModalMessage"
        :confirm-text="confirmModalButtonText"
        :danger="modalActionType === 'delete'"
        :loading="actionLoading"
        :require-match-text="modalActionType === 'delete' ? quote.number : undefined"
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
    </template>
  </div>
</template>

<script setup lang="ts">
import QuoteStatusBadge from '~/components/quotes/QuoteStatusBadge.vue'
import ClientStatusBadge from '~/components/clients/ClientStatusBadge.vue'
import QuoteStatusActions from '~/components/quotes/QuoteStatusActions.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import NotificationToast from '~/components/ui/NotificationToast.vue'
import { formatMoney } from '~/server/utils/calculation'
import type { QuoteStatus } from '@prisma/client'
import type { QuoteWithRelations } from '~/composables/useQuotes'
import { useInvoices } from '~/composables/useInvoices'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { fetchQuote, changeStatus, duplicateQuote, archiveQuote, restoreQuote, deleteQuote, downloadPdf } = useQuotes()
const { convertQuoteToInvoice } = useInvoices()

const quote = ref<QuoteWithRelations | null>(null)
const loading = ref(true)

const canArchiveRestore = computed(() => ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user.value?.role || ''))
const canDelete = computed(() => user.value?.role === 'SUPER_ADMIN')
const canConvertToInvoice = computed(() => ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user.value?.role || ''))

async function handleConvertToInvoice() {
  if (!quote.value) return
  if (!confirm(`Voulez-vous vraiment convertir le devis "${quote.value.number}" en facture ?`)) return
  actionLoading.value = true
  try {
    const inv = await convertQuoteToInvoice(quote.value.id)
    triggerToast('Devis converti', `Le devis ${quote.value.number} a été converti en facture.`)
    await navigateTo(`/factures/${inv.id}`)
  } catch (err: any) {
    triggerToast('Erreur de conversion', err.message || 'Échec de la conversion', 'error')
  } finally {
    actionLoading.value = false
  }
}

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
  if (modalActionType.value === 'delete') return 'Supprimer définitivement le devis'
  if (modalActionType.value === 'archive') return 'Archiver le devis'
  return 'Restaurer le devis'
})

const confirmModalMessage = computed(() => {
  if (!quote.value) return ''
  if (modalActionType.value === 'delete') {
    return `Êtes-vous sûr de vouloir supprimer définitivement le devis "${quote.value.number}" ? Cette action est irréversible.`
  }
  if (modalActionType.value === 'archive') {
    return `Voulez-vous archiver le devis "${quote.value.number}" ?`
  }
  return `Voulez-vous restaurer le devis "${quote.value.number}" dans la liste des devis actifs ?`
})

const confirmModalButtonText = computed(() => {
  if (modalActionType.value === 'delete') return 'Supprimer définitivement'
  if (modalActionType.value === 'archive') return 'Archiver le devis'
  return 'Restaurer le devis'
})

async function loadQuoteData() {
  const id = route.params.id as string
  if (id) {
    loading.value = true
    quote.value = await fetchQuote(id)
    loading.value = false
  }
}

async function handleStatusChange(newStatus: QuoteStatus) {
  if (!quote.value) return
  actionLoading.value = true
  const ok = await changeStatus(quote.value.id, newStatus)
  actionLoading.value = false

  if (ok) {
    triggerToast('Statut mis à jour', `Le devis "${quote.value.number}" est maintenant au statut ${newStatus}.`)
    await loadQuoteData()
  } else {
    triggerToast('Erreur', 'Changement de statut impossible', 'error')
  }
}

async function handleDuplicate() {
  if (!quote.value) return
  const result = await duplicateQuote(quote.value.id)
  if (result.success && result.quote) {
    triggerToast('Devis dupliqué', `Nouveau devis "${result.quote.number}" créé sous forme de brouillon.`)
    await navigateTo(`/devis/${result.quote.id}/edit`)
  } else {
    triggerToast('Erreur', result.message || 'Échec de la duplication', 'error')
  }
}

function openArchiveModal() {
  if (!quote.value) return
  modalActionType.value = quote.value.isArchived ? 'restore' : 'archive'
  showConfirmModal.value = true
}

function openDeleteModal() {
  if (!quote.value) return
  modalActionType.value = 'delete'
  showConfirmModal.value = true
}

async function executeQuoteAction() {
  if (!quote.value) return
  actionLoading.value = true

  try {
    let ok = false
    if (modalActionType.value === 'archive') {
      ok = await archiveQuote(quote.value.id)
      if (ok) triggerToast('Devis archivé', `Le devis "${quote.value.number}" a été archivé.`)
    } else if (modalActionType.value === 'restore') {
      ok = await restoreQuote(quote.value.id)
      if (ok) triggerToast('Devis restauré', `Le devis "${quote.value.number}" est à nouveau actif.`)
    } else if (modalActionType.value === 'delete') {
      ok = await deleteQuote(quote.value.id)
      if (ok) {
        triggerToast('Devis supprimé', `Le devis "${quote.value.number}" a été supprimé.`)
        await router.push('/devis')
        return
      }
    }

    if (ok) {
      showConfirmModal.value = false
      await loadQuoteData()
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

await useAsyncData(`quote-detail-${route.params.id}`, () => loadQuoteData())
</script>
