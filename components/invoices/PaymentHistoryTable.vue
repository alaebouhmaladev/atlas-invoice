<template>
  <div class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft space-y-4 p-5">
    <div class="flex items-center justify-between border-b border-custom pb-3">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-control bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 002-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </span>
        <h3 class="text-xs font-bold text-main uppercase tracking-wider">
          Historique des Règlements Encaissés
        </h3>
      </div>
      <span class="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
        Total Encaissé : {{ formatMoney(totalPaid) }}
      </span>
    </div>

    <!-- Empty State -->
    <div v-if="!payments || payments.length === 0" class="py-8 text-center text-muted-custom text-xs">
      Aucun règlement enregistré pour cette facture.
    </div>

    <!-- Payments Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs">
        <thead>
          <tr class="border-b border-custom bg-panel-raised text-muted-custom uppercase tracking-wider font-bold">
            <th class="py-2.5 px-3">Date</th>
            <th class="py-2.5 px-3">Montant</th>
            <th class="py-2.5 px-3">Mode</th>
            <th class="py-2.5 px-3">Référence</th>
            <th class="py-2.5 px-3">Statut</th>
            <th class="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-custom">
          <tr
            v-for="payment in payments"
            :key="payment.id"
            class="hover:bg-surface-hover transition-colors"
            :class="{ 'opacity-50 line-through bg-rose-500/5': payment.status === 'REVERSED' }"
          >
            <td class="py-2.5 px-3 text-main font-mono">{{ formatDate(payment.paymentDate) }}</td>
            <td class="py-2.5 px-3 font-mono font-bold" :class="payment.status === 'REVERSED' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'">
              {{ formatMoney(payment.amount) }}
            </td>
            <td class="py-2.5 px-3 text-main">{{ methodLabel(payment.method) }}</td>
            <td class="py-2.5 px-3 text-muted-custom font-mono">{{ payment.reference || '—' }}</td>
            <td class="py-2.5 px-3">
              <span
                v-if="payment.status === 'CONFIRMED'"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              >
                Confirmé
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                :title="`Annulé pour : ${payment.reversalReason || 'Non spécifié'}`"
              >
                Annulé
              </span>
            </td>
            <td class="py-2.5 px-3 text-right">
              <button
                v-if="payment.status === 'CONFIRMED' && isSuperAdmin && invoiceStatus === 'FINALIZED'"
                type="button"
                @click="$emit('open-reversal-modal', payment)"
                class="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 rounded-control text-[11px] font-bold transition-colors cursor-pointer"
              >
                Annuler le paiement
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney } from '~/server/utils/calculation'

const props = defineProps<{
  payments: any[]
  userRole?: string
  invoiceStatus?: string
}>()

const emit = defineEmits(['open-reversal-modal'])

const isSuperAdmin = computed(() => props.userRole === 'SUPER_ADMIN')

const totalPaid = computed(() => {
  return (props.payments || [])
    .filter((p) => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amount), 0)
})

const methodLabel = (method: string) => {
  switch (method) {
    case 'BANK_TRANSFER':
      return 'Virement'
    case 'CHEQUE':
      return 'Chèque'
    case 'CASH':
      return 'Espèces'
    case 'CREDIT_CARD':
      return 'Carte bancaire'
    default:
      return method
  }
}

const formatDate = (d: string | Date) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
</script>
