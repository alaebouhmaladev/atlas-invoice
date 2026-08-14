<template>
  <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
    <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
      Récapitulatif Financier Facture
    </h3>

    <div class="space-y-2 text-xs">
      <div class="flex justify-between text-slate-400">
        <span>Sous-total HT :</span>
        <span class="font-mono text-slate-200">{{ formatMoney(totals.subtotalHt) }}</span>
      </div>

      <div v-if="hasLineDiscounts" class="flex justify-between text-amber-400">
        <span>Remises sur les lignes :</span>
        <span class="font-mono">- {{ formatMoney(totals.lineDiscountsTotal) }}</span>
      </div>

      <div v-if="hasGlobalDiscount" class="flex justify-between text-amber-400">
        <span>Remise globale :</span>
        <span class="font-mono">- {{ formatMoney(totals.globalDiscountTotal) }}</span>
      </div>

      <div class="flex justify-between text-slate-200 font-semibold border-t border-slate-800/80 pt-2">
        <span>Total Net HT :</span>
        <span class="font-mono">{{ formatMoney(totals.totalNetHt) }}</span>
      </div>

      <!-- TVA Breakdown per rate -->
      <div v-if="totals.vatBreakdown && totals.vatBreakdown.length > 0" class="space-y-1 pt-1">
        <div
          v-for="vat in totals.vatBreakdown"
          :key="vat.rate"
          class="flex justify-between text-slate-400 text-[11px]"
        >
          <span>TVA {{ Number(vat.rate) }}% (sur {{ formatMoney(vat.netAmountHt) }}) :</span>
          <span class="font-mono text-slate-300">+ {{ formatMoney(vat.vatAmount) }}</span>
        </div>
      </div>

      <div class="flex justify-between text-slate-400">
        <span>TVA Total :</span>
        <span class="font-mono text-slate-200">{{ formatMoney(totals.totalVat) }}</span>
      </div>

      <!-- Total TTC Highlight Box -->
      <div class="flex justify-between items-center bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 p-3 rounded-xl text-amber-400 font-bold text-sm mt-3">
        <span>Total TTC :</span>
        <span class="font-mono text-lg">{{ formatMoney(totals.totalTtc) }}</span>
      </div>

      <!-- Paid & Due Amounts if provided -->
      <div v-if="amountPaid !== undefined" class="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
        <div class="flex justify-between text-emerald-400">
          <span>Déjà encaissé :</span>
          <span class="font-mono font-bold">{{ formatMoney(amountPaid) }}</span>
        </div>
        <div class="flex justify-between text-rose-400 font-bold">
          <span>Reste à régler :</span>
          <span class="font-mono text-sm">{{ formatMoney(amountDue || 0) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney, type CalculatedQuoteTotals } from '~/server/utils/calculation'

const props = defineProps<{
  totals: CalculatedQuoteTotals
  amountPaid?: number | string
  amountDue?: number | string
}>()

const hasLineDiscounts = computed(() => {
  return Number(props.totals?.lineDiscountsTotal || 0) > 0
})

const hasGlobalDiscount = computed(() => {
  return Number(props.totals?.globalDiscountTotal || 0) > 0
})
</script>
