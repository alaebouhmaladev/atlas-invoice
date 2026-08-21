<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="bg-panel border border-custom rounded-panel w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-custom flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-control bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-bold text-main">Enregistrer un Paiement</h3>
              <p class="text-[11px] text-muted-custom">Facture N° {{ invoiceNumber }}</p>
            </div>
          </div>
          <button
            @click="$emit('close')"
            class="text-muted-custom hover:text-main p-1 rounded-control hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Balance Info Banner -->
        <div class="px-6 py-3 bg-panel-raised border-b border-custom grid grid-cols-2 gap-4 text-xs">
          <div>
            <span class="text-muted-custom text-[11px]">Total TTC Facture :</span>
            <div class="font-mono font-bold text-main">{{ formatMoney(totalTtc) }}</div>
          </div>
          <div>
            <span class="text-muted-custom text-[11px]">Reste à Régler :</span>
            <div class="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">{{ formatMoney(amountDue) }}</div>
          </div>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="handleSubmit" class="p-6 space-y-4 text-xs">
          <div v-if="error" class="p-3 rounded-card bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold">
            {{ error }}
          </div>

          <!-- Amount -->
          <div>
            <label class="block font-bold text-muted-custom uppercase tracking-wider text-[11px] mb-1">
              Montant du Paiement (MAD) *
            </label>
            <div class="relative">
              <input
                v-model.number="form.amount"
                type="number"
                step="any"
                min="0.01"
                :max="Number(amountDue)"
                required
                class="w-full pl-4 pr-24 py-2.5 bg-panel-raised border border-custom rounded-control text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:border-brand"
              />
              <button
                type="button"
                @click="form.amount = Number(amountDue)"
                class="absolute right-2 top-2 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold rounded-pill border border-emerald-500/20 transition-colors cursor-pointer"
              >
                Solde Total
              </button>
            </div>
          </div>

          <!-- Payment Date & Method -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-muted-custom uppercase tracking-wider text-[11px] mb-1">
                Date du règlement *
              </label>
              <input
                v-model="form.paymentDate"
                type="date"
                required
                class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label class="block font-bold text-muted-custom uppercase tracking-wider text-[11px] mb-1">
                Mode de règlement *
              </label>
              <select
                v-model="form.method"
                required
                class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
              >
                <option value="BANK_TRANSFER">Virement Bancaire</option>
                <option value="CHEQUE">Chèque</option>
                <option value="CASH">Espèces</option>
                <option value="CREDIT_CARD">Carte Bancaire</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
          </div>

          <!-- Reference -->
          <div>
            <label class="block font-bold text-muted-custom uppercase tracking-wider text-[11px] mb-1">
              Référence (N° Chèque / N° Virement)
            </label>
            <input
              v-model="form.reference"
              type="text"
              placeholder="Ex: VIR-BMCE-992810"
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="block font-bold text-muted-custom uppercase tracking-wider text-[11px] mb-1">
              Notes complémentaires
            </label>
            <textarea
              v-model="form.notes"
              rows="2"
              placeholder="Remarques pour la comptabilité..."
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            ></textarea>
          </div>

          <!-- Modal Footer -->
          <div class="pt-3 border-t border-custom flex justify-end gap-2">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main rounded-control text-xs font-semibold border border-custom transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-5 py-2 bg-brand text-on-brand hover:bg-brand-strong font-bold rounded-pill text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <svg v-if="loading" class="animate-spin h-4 w-4 text-on-brand" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Valider le règlement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { formatMoney } from '~/server/utils/calculation'

const props = defineProps<{
  show: boolean
  invoiceNumber: string
  totalTtc: number | string
  amountDue: number | string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits(['close', 'submit'])

const today = new Date().toISOString().split('T')[0]

const form = reactive({
  amount: Number(props.amountDue) || 0,
  paymentDate: today,
  method: 'BANK_TRANSFER',
  reference: '',
  notes: ''
})

watch(
  () => props.amountDue,
  (val) => {
    form.amount = Number(val) || 0
  }
)

const handleSubmit = () => {
  emit('submit', { ...form })
}
</script>
