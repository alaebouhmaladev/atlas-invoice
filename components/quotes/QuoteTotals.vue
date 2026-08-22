<template>
  <div class="bg-panel border border-custom rounded-card p-5 space-y-3 shadow-soft">
    <h3 class="text-xs font-bold text-main uppercase tracking-wider border-b border-custom pb-2">
      Récapitulatif Financier (Calcul en Direct)
    </h3>

    <div class="space-y-2 text-xs">
      <div class="flex justify-between text-muted-custom">
        <span>Sous-total HT :</span>
        <span class="font-mono font-bold text-main">{{ formatMoney(totals.subtotalHt) }}</span>
      </div>

      <div v-if="hasLineDiscounts" class="flex justify-between text-brand-strong">
        <span>Remises sur les lignes :</span>
        <span class="font-mono font-bold">- {{ formatMoney(totals.lineDiscountsTotal) }}</span>
      </div>

      <div v-if="hasGlobalDiscount" class="flex justify-between text-brand-strong">
        <span>Remise globale :</span>
        <span class="font-mono font-bold">- {{ formatMoney(totals.globalDiscountTotal) }}</span>
      </div>

      <div class="flex justify-between text-main font-bold border-t border-custom pt-2">
        <span>Total Net HT :</span>
        <span class="font-mono text-base">{{ formatMoney(totals.totalNetHt) }}</span>
      </div>

      <!-- TVA Breakdown per rate -->
      <div v-if="totals.vatBreakdown && totals.vatBreakdown.length > 0" class="space-y-1 pt-1">
        <div
          v-for="vat in totals.vatBreakdown"
          :key="vat.rate"
          class="flex justify-between text-muted-custom text-xs"
        >
          <span>TVA {{ Number(vat.rate) }}% (sur {{ formatMoney(vat.netAmountHt) }}) :</span>
          <span class="font-mono text-main font-bold">+ {{ formatMoney(vat.vatAmount) }}</span>
        </div>
      </div>

      <div class="flex justify-between text-muted-custom">
        <span>TVA Total :</span>
        <span class="font-mono font-bold text-main">{{ formatMoney(totals.totalVat) }}</span>
      </div>

      <!-- Total TTC Highlight Box -->
      <div class="flex justify-between items-center bg-brand-soft border border-brand-soft p-3.5 rounded-control text-brand-strong font-bold text-sm mt-3">
        <span>Total TTC :</span>
        <span class="font-mono text-lg font-black text-main">{{ formatMoney(totals.totalTtc) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatMoney, type CalculatedQuoteTotals } from '~/server/utils/calculation'

const props = defineProps<{
  totals: CalculatedQuoteTotals
}>()

const hasLineDiscounts = computed(() => {
  return Number(props.totals.lineDiscountsTotal) > 0
})

const hasGlobalDiscount = computed(() => {
  return Number(props.totals.globalDiscountTotal) > 0
})
</script>
