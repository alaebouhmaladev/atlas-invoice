<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Top Back Link -->
    <div>
      <NuxtLink to="/factures" class="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Retour aux factures</span>
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading && !invoice" class="p-12 text-center text-slate-400">
      <svg class="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs">Chargement de la facture...</p>
    </div>

    <!-- Invoice Not Found Error -->
    <div v-else-if="!invoice" class="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
      <h3 class="text-base font-bold text-slate-100">Facture introuvable</h3>
      <NuxtLink to="/factures" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold">
        Retour à la liste des factures
      </NuxtLink>
    </div>

    <!-- Main Facture Profile Card -->
    <template v-else>
      <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <!-- Header Info & Action Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div class="space-y-1.5">
            <div class="flex items-center gap-3 flex-wrap">
              <h2 class="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
                {{ invoice.number || `BROUILLON #${invoice.id.substring(0, 6).toUpperCase()}` }}
              </h2>
              <InvoiceStatusBadge :status="invoice.status" />
              <PaymentStatusBadge :status="invoice.paymentStatus" :is-overdue="invoice.isOverdue" />
            </div>

            <p v-if="invoice.subject" class="text-sm font-semibold text-slate-200">
              Objet : {{ invoice.subject }}
            </p>
          </div>

          <!-- Actions Bar Component -->
          <InvoiceStatusActions
            :invoice="invoice"
            :user-role="user?.role"
            :loading="loading"
            @finalize="handleFinalize"
            @open-payment-modal="paymentModalOpen = true"
            @open-cancel-modal="cancelModalOpen = true"
            @archive="handleArchive"
            @restore="handleRestore"
            @delete="openDeleteModal"
          />
        </div>

        <!-- Banners for Draft or Cancelled status -->
        <div v-if="invoice.status === 'DRAFT'" class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
          <svg class="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span class="font-bold">Facture en cours de rédaction (Brouillon) :</span> Ce document n'a pas encore de numéro officiel définitif.
          </div>
        </div>

        <div v-if="invoice.status === 'CANCELLED'" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <div>
            <span class="font-bold">Facture Annulée :</span> {{ invoice.cancellationReason || 'Annulée par l\'administrateur' }}
          </div>
        </div>

        <!-- Facture Header Cards Grid (Client & Document Details) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Client Snapshot Box -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Client (Informations Figées)</span>
              <NuxtLink v-if="invoice.clientId" :to="`/clients/${invoice.clientId}`" class="text-[11px] text-slate-400 hover:text-white font-normal underline">
                Fiche client actuelle
              </NuxtLink>
            </h3>

            <div class="space-y-2 text-xs">
              <div class="text-sm font-bold text-slate-100">{{ invoice.clientSnapshot?.displayName }}</div>
              <div v-if="invoice.clientSnapshot?.ice" class="font-mono text-slate-300">ICE: {{ invoice.clientSnapshot.ice }}</div>
              <div v-if="invoice.clientSnapshot?.taxId" class="font-mono text-slate-400">IF: {{ invoice.clientSnapshot.taxId }}</div>
              <div v-if="invoice.clientSnapshot?.address" class="text-slate-300">
                {{ invoice.clientSnapshot.address }} {{ invoice.clientSnapshot.city ? `, ${invoice.clientSnapshot.city}` : '' }}
              </div>
              <div v-if="invoice.clientSnapshot?.phone || invoice.clientSnapshot?.email" class="text-slate-400 text-[11px]">
                {{ invoice.clientSnapshot.phone }} • {{ invoice.clientSnapshot.email }}
              </div>
            </div>
          </div>

          <!-- Document Dates & Financial Status -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Détails & Échéances Facture
            </h3>

            <div class="space-y-2 text-xs">
              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Date d'émission</span>
                <span class="text-slate-100 font-medium">{{ formatDate(invoice.issueDate) }}</span>
              </div>

              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Date d'échéance</span>
                <span class="text-slate-100 font-medium">{{ formatDate(invoice.dueDate) }}</span>
              </div>

              <div v-if="invoice.sourceQuote" class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Devis d'origine</span>
                <NuxtLink :to="`/devis/${invoice.sourceQuote.id}`" class="text-amber-400 hover:underline font-mono font-bold">
                  {{ invoice.sourceQuote.number }}
                </NuxtLink>
              </div>

              <div class="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span class="text-slate-400">Total Encaissé</span>
                <span class="text-emerald-400 font-mono font-bold">{{ formatMoney(invoice.amountPaid) }}</span>
              </div>

              <div class="flex justify-between">
                <span class="text-slate-400">Solde Dû</span>
                <span class="font-mono font-bold" :class="Number(invoice.amountDue) > 0 ? 'text-rose-400' : 'text-emerald-400'">
                  {{ formatMoney(invoice.amountDue) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="space-y-3">
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Lignes de Prestations Facturées
          </h3>

          <div class="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-semibold">
                    <th class="py-3 px-4">Prestation</th>
                    <th class="py-3 px-4 text-center">Qté</th>
                    <th class="py-3 px-4 text-right">P.U. HT</th>
                    <th class="py-3 px-4 text-right">Remise</th>
                    <th class="py-3 px-4 text-center">TVA</th>
                    <th class="py-3 px-4 text-right">Total TTC</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60">
                  <tr v-for="item in invoice.items" :key="item.id" class="hover:bg-slate-900/40 transition-colors">
                    <td class="py-3 px-4">
                      <div class="font-bold text-slate-200">{{ item.title }}</div>
                      <div v-if="item.description" class="text-[11px] text-slate-400 mt-0.5 whitespace-pre-line">{{ item.description }}</div>
                    </td>
                    <td class="py-3 px-4 text-center font-mono text-slate-300">{{ item.quantity }} {{ item.unit }}</td>
                    <td class="py-3 px-4 text-right font-mono text-slate-300">{{ formatMoney(item.unitPriceHt) }}</td>
                    <td class="py-3 px-4 text-right font-mono text-amber-400">
                      {{ Number(item.discountRate) > 0 ? `${item.discountRate}%` : '—' }}
                    </td>
                    <td class="py-3 px-4 text-center font-mono text-slate-400">{{ item.vatRate }}%</td>
                    <td class="py-3 px-4 text-right font-mono font-bold text-slate-100">{{ formatMoney(item.totalTtc) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Financial Summary Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-6 space-y-4">
            <div v-if="invoice.paymentTerms || invoice.publicNotes" class="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
              <span class="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Conditions & Remarques</span>
              <p v-if="invoice.paymentTerms" class="text-slate-300"><strong>Règlement :</strong> {{ invoice.paymentTerms }}</p>
              <p v-if="invoice.publicNotes" class="text-slate-400 italic">"{{ invoice.publicNotes }}"</p>
            </div>
          </div>

          <div class="lg:col-span-6">
            <InvoiceTotals
              :totals="invoiceFinancialTotals"
              :amount-paid="invoice.amountPaid"
              :amount-due="invoice.amountDue"
            />
          </div>
        </div>

        <!-- Payments Section -->
        <PaymentHistoryTable
          :payments="invoice.payments"
          :user-role="user?.role"
          :invoice-status="invoice.status"
          @open-reversal-modal="openReversalModal"
        />
      </div>
    </template>

    <!-- Payment Entry Modal -->
    <PaymentModal
      :show="paymentModalOpen"
      :invoice-number="invoice?.number || ''"
      :total-ttc="invoice?.totalTtc || 0"
      :amount-due="invoice?.amountDue || 0"
      :loading="actionLoading"
      :error="actionError"
      @close="paymentModalOpen = false"
      @submit="handleSavePayment"
    />

    <!-- Cancel Invoice Modal -->
    <ConfirmDialog
      :show="cancelModalOpen"
      title="Annuler la facture"
      message="Attention: L'annulation d'une facture est définitive et désactivera ce numéro pour la comptabilité."
      confirm-text="Confirmer l'annulation"
      :danger="true"
      :loading="actionLoading"
      @confirm="handleConfirmCancel"
      @close="cancelModalOpen = false"
    >
      <div class="mt-3">
        <label class="block text-xs font-semibold text-slate-300 mb-1">Raison de l'annulation (obligatoire) *</label>
        <textarea
          v-model="cancellationReason"
          rows="2"
          placeholder="Ex: Erreur de facturation, prestation annulée..."
          class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
        ></textarea>
      </div>
    </ConfirmDialog>

    <!-- Reversal Payment Modal -->
    <ConfirmDialog
      :show="reversalModalOpen"
      title="Annuler le paiement encaisse"
      message="Cette action va contrepasser le paiement et réajuster le solde restant dû."
      confirm-text="Confirmer le contrepassement"
      :danger="true"
      :loading="actionLoading"
      @confirm="handleConfirmReversal"
      @close="reversalModalOpen = false"
    >
      <div class="mt-3">
        <label class="block text-xs font-semibold text-slate-300 mb-1">Motif de l'annulation du paiement *</label>
        <textarea
          v-model="reversalReason"
          rows="2"
          placeholder="Ex: Erreur de saisie, chèque rejeté par la banque..."
          class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
        ></textarea>
      </div>
    </ConfirmDialog>

    <!-- Permanent Delete Modal -->
    <ConfirmDialog
      :show="deleteModalOpen"
      title="Supprimer définitivement le brouillon"
      message="Cette action est irréversible et supprimera le brouillon de facture sans laisser de trou de numérotation."
      confirm-text="Supprimer définitivement"
      :danger="true"
      :loading="actionLoading"
      @confirm="handleConfirmDelete"
      @close="deleteModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInvoices } from '~/composables/useInvoices'
import { usePayments } from '~/composables/usePayments'
import { useAuth } from '~/composables/useAuth'
import { formatMoney, calculateQuoteFinancials, type RawLineItemInput } from '~/server/utils/calculation'
import InvoiceStatusBadge from '~/components/invoices/InvoiceStatusBadge.vue'
import PaymentStatusBadge from '~/components/invoices/PaymentStatusBadge.vue'
import InvoiceStatusActions from '~/components/invoices/InvoiceStatusActions.vue'
import InvoiceTotals from '~/components/invoices/InvoiceTotals.vue'
import PaymentHistoryTable from '~/components/invoices/PaymentHistoryTable.vue'
import PaymentModal from '~/components/invoices/PaymentModal.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const {
  loading,
  error,
  fetchInvoice,
  finalizeInvoice,
  cancelInvoice,
  archiveInvoice,
  restoreInvoice,
  deleteInvoice
} = useInvoices()

const { addPayment, reversePayment } = usePayments()
const notify = useNotify()

const invoice = ref<any>(null)
const actionLoading = ref(false)
const actionError = ref<string | null>(null)

// Modals state
const paymentModalOpen = ref(false)
const cancelModalOpen = ref(false)
const cancellationReason = ref('')
const reversalModalOpen = ref(false)
const targetPayment = ref<any>(null)
const reversalReason = ref('')
const deleteModalOpen = ref(false)

const loadInvoiceDetails = async () => {
  const id = route.params.id as string
  invoice.value = await fetchInvoice(id)
}

onMounted(loadInvoiceDetails)

const invoiceFinancialTotals = computed(() => {
  if (!invoice.value) {
    return {
      subtotalHt: '0.00',
      lineDiscountsTotal: '0.00',
      globalDiscountTotal: '0.00',
      discountAmount: '0.00',
      totalNetHt: '0.00',
      totalVat: '0.00',
      totalTtc: '0.00',
      vatBreakdown: [],
      items: []
    }
  }

  const rawItems: RawLineItemInput[] = (invoice.value.items || []).map((it: any, idx: number) => ({
    position: it.position || idx + 1,
    title: it.title || 'Prestation',
    unit: it.unit || 'Personne',
    quantity: Number(it.quantity),
    unitPriceHt: Number(it.unitPriceHt),
    discountRate: Number(it.discountRate || 0),
  }))

  return calculateQuoteFinancials(rawItems, {
    discountType: invoice.value.discountType as any,
    discountValue: Number(invoice.value.discountValue || 0)
  })
})

const handleFinalize = async () => {
  actionLoading.value = true
  try {
    const updated = await finalizeInvoice(invoice.value.id)
    invoice.value = updated
    notify.success('Facture finalisée avec succès', `Le numéro officiel ${updated.number} a été attribué.`)
  } catch (err: any) {
    notify.error('Erreur de finalisation', err.message || 'Échec de la finalisation')
  } finally {
    actionLoading.value = false
  }
}

const handleSavePayment = async (paymentPayload: any) => {
  actionLoading.value = true
  actionError.value = null
  try {
    await addPayment(invoice.value.id, paymentPayload)
    paymentModalOpen.value = false
    await loadInvoiceDetails()
    notify.success('Paiement enregistré avec succès', 'Le montant a été crédité et le solde dû mis à jour.')
  } catch (err: any) {
    actionError.value = err.message
    notify.error('Erreur enregistrement paiement', err.message || 'Échec de l\'enregistrement')
  } finally {
    actionLoading.value = false
  }
}

const handleConfirmCancel = async () => {
  if (!cancellationReason.value.trim()) {
    notify.error('Raison obligatoire', 'Veuillez saisir un motif d\'annulation.')
    return
  }

  actionLoading.value = true
  try {
    const updated = await cancelInvoice(invoice.value.id, cancellationReason.value)
    invoice.value = updated
    cancelModalOpen.value = false
    cancellationReason.value = ''
    notify.success('Facture annulée avec succès', 'La facture a été marquée comme annulée.')
  } catch (err: any) {
    notify.error('Erreur d\'annulation', err.message || 'Échec de l\'annulation')
  } finally {
    actionLoading.value = false
  }
}

const openReversalModal = (payment: any) => {
  targetPayment.value = payment
  reversalReason.value = ''
  reversalModalOpen.value = true
}

const handleConfirmReversal = async () => {
  if (!reversalReason.value.trim()) {
    notify.error('Raison obligatoire', 'Veuillez indiquer le motif d\'annulation du paiement.')
    return
  }

  actionLoading.value = true
  try {
    await reversePayment(invoice.value.id, targetPayment.value.id, reversalReason.value)
    reversalModalOpen.value = false
    await loadInvoiceDetails()
    notify.success('Paiement annulé avec succès', 'Le règlement a été contrepassé et le solde ajusté.')
  } catch (err: any) {
    notify.error('Erreur d\'annulation du paiement', err.message || 'Échec du contrepassement')
  } finally {
    actionLoading.value = false
  }
}

const handleArchive = async () => {
  actionLoading.value = true
  try {
    const updated = await archiveInvoice(invoice.value.id)
    invoice.value = updated
    notify.success('Facture archivée avec succès', 'La facture a été déplacée vers les archives.')
  } catch (err: any) {
    notify.error('Erreur d\'archivage', err.message || 'Échec de l\'archivage')
  } finally {
    actionLoading.value = false
  }
}

const handleRestore = async () => {
  actionLoading.value = true
  try {
    const updated = await restoreInvoice(invoice.value.id)
    invoice.value = updated
    notify.success('Facture restaurée avec succès', 'La facture a été restaurée parmi les factures actives.')
  } catch (err: any) {
    notify.error('Erreur de restauration', err.message || 'Échec de la restauration')
  } finally {
    actionLoading.value = false
  }
}

const openDeleteModal = () => {
  deleteModalOpen.value = true
}

const handleConfirmDelete = async () => {
  actionLoading.value = true
  try {
    await deleteInvoice(invoice.value.id)
    deleteModalOpen.value = false
    notify.success('Brouillon supprimé', 'Le brouillon a été supprimé.')
    await navigateTo('/factures')
  } catch (err: any) {
    notify.error('Erreur de suppression', err.message || 'Échec de la suppression')
  } finally {
    actionLoading.value = false
  }
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
