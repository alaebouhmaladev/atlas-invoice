<template>
  <form class="space-y-8" @submit.prevent="handleSubmit">
    <!-- General Error Banner -->
    <div
      v-if="error"
      class="p-4 rounded-card bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-3 font-bold"
      role="alert"
    >
      <svg class="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>{{ error }}</div>
    </div>

    <!-- SECTION 1: Informations Générales -->
    <div class="bg-panel border border-custom rounded-panel p-6 space-y-5 shadow-soft">
      <div class="border-b border-custom pb-3">
        <h3 class="text-sm font-bold text-main uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-control bg-brand-soft text-brand-strong flex items-center justify-center text-xs font-bold border border-brand-soft">1</span>
          {{ isEdit ? 'Modifier le Brouillon de Facture' : 'Informations Générales de la Facture' }}
        </h3>
        <p class="text-xs text-muted-custom mt-1">Renseignez le client, les dates et les détails de facturation.</p>
      </div>

      <!-- Client & Dates -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Client *</label>
          <select
            v-model="form.clientId"
            class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            required
            :disabled="isEdit && invoice?.sourceQuoteId"
          >
            <option value="" disabled>Sélectionner un client...</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.displayName }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Date d'émission *</label>
          <input
            v-model="form.issueDate"
            type="date"
            class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            required
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Date d'échéance *</label>
          <input
            v-model="form.dueDate"
            type="date"
            class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            required
          />
        </div>
      </div>

      <!-- Subject / Objet -->
      <div>
        <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Objet de la facture</label>
        <input
          v-model="form.subject"
          type="text"
          placeholder="Ex: Facturation prestation traiteur cocktail dînatoire..."
          class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
        />
      </div>
    </div>

    <!-- SECTION 2: Lignes de Facturation -->
    <div class="bg-panel border border-custom rounded-panel p-6 shadow-soft">
      <InvoiceItemsEditor
        :items="form.items"
        @update:items="form.items = $event"
      />
    </div>

    <!-- SECTION 3: Récapitulatif Financier & Remise Globale -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-6 space-y-4">
        <!-- Remise Globale -->
        <div class="bg-panel border border-custom rounded-panel p-5 shadow-soft space-y-3">
          <h4 class="text-xs font-bold text-main uppercase tracking-wider border-b border-custom pb-2">
            Remise Globale (Optionnelle)
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Type de remise</label>
              <select
                v-model="form.discountType"
                class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
              >
                <option value="PERCENTAGE">Pourcentage (%)</option>
                <option value="FIXED_AMOUNT">Montant Fixe (MAD)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Valeur</label>
              <input
                v-model.number="form.discountValue"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand text-right font-mono"
              />
            </div>
          </div>
        </div>

        <!-- Notes & Terms -->
        <div class="bg-panel border border-custom rounded-panel p-5 shadow-soft space-y-4">
          <h4 class="text-xs font-bold text-main uppercase tracking-wider border-b border-custom pb-2">
            Conditions & Remarques
          </h4>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Conditions de règlement</label>
            <input
              v-model="form.paymentTerms"
              type="text"
              placeholder="Ex: Règlement à 30 jours à compter de la date d'émission"
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Notes publiques (visibles sur le PDF)</label>
            <textarea
              v-model="form.publicNotes"
              rows="2"
              placeholder="Mentions légales, coordonnées bancaires..."
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            ></textarea>
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Notes internes (équipe uniquement)</label>
            <textarea
              v-model="form.internalNotes"
              rows="2"
              placeholder="Notes pour l'équipe comptable..."
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Financial Totals -->
      <div class="lg:col-span-6">
        <InvoiceTotals :totals="calculatedTotals" />
      </div>
    </div>

    <!-- Submit Bar -->
    <div class="flex items-center justify-end gap-3 pt-4 border-t border-custom">
      <NuxtLink
        to="/factures"
        class="px-5 py-2.5 bg-panel-raised hover:bg-surface-hover text-main font-semibold border border-custom rounded-control text-xs transition-colors"
      >
        Annuler
      </NuxtLink>

      <button
        type="submit"
        :disabled="loading"
        class="px-6 py-2.5 bg-brand text-on-brand hover:bg-brand-strong font-bold rounded-pill text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <svg v-if="loading" class="animate-spin h-4 w-4 text-on-brand" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ isEdit ? 'Mettre à jour le brouillon' : 'Enregistrer le brouillon de facture' }}</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import InvoiceItemsEditor from './InvoiceItemsEditor.vue'
import InvoiceTotals from './InvoiceTotals.vue'
import { calculateQuoteFinancials, type RawLineItemInput } from '~/server/utils/calculation'

const props = defineProps<{
  invoice?: any
  isEdit?: boolean
  initialClientId?: string
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits(['submit'])

const clients = ref<Array<{ id: string; displayName: string }>>([])

const todayStr = new Date().toISOString().split('T')[0]
const defaultDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const form = reactive({
  clientId: props.invoice?.clientId || props.initialClientId || '',
  issueDate: props.invoice?.issueDate ? new Date(props.invoice.issueDate).toISOString().split('T')[0] : todayStr,
  dueDate: props.invoice?.dueDate ? new Date(props.invoice.dueDate).toISOString().split('T')[0] : defaultDue,
  subject: props.invoice?.subject || '',
  discountType: props.invoice?.discountType || 'PERCENTAGE',
  discountValue: props.invoice?.discountValue ? Number(props.invoice.discountValue) : 0,
  paymentTerms: props.invoice?.paymentTerms || 'Règlement sous 30 jours à réception de facture',
  publicNotes: props.invoice?.publicNotes || 'Merci pour votre confiance.',
  internalNotes: props.invoice?.internalNotes || '',
  items: props.invoice?.items?.map((item: any) => ({
    id: item.id,
    title: item.title,
    description: item.description || '',
    quantity: Number(item.quantity),
    unit: item.unit || 'Personne',
    unitPriceHt: Number(item.unitPriceHt),
    discountRate: Number(item.discountRate || 0),
    vatRate: Number(item.vatRate || 20)
  })) || [
    {
      title: '',
      description: '',
      quantity: 1,
      unit: 'Personne',
      unitPriceHt: 0,
      discountRate: 0,
      vatRate: 20
    }
  ]
})

onMounted(async () => {
  try {
    const res = await $fetch<any>('/api/clients?pageSize=100', {
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      clients.value = res.data.data
    }
  } catch (e) {
    // fallback
  }
})

const calculatedTotals = computed(() => {
  try {
    const rawItems: RawLineItemInput[] = form.items.map((it: any, idx: number) => ({
      position: idx + 1,
      title: it.title || 'Prestation',
      unit: it.unit || 'Personne',
      quantity: it.quantity || 0,
      unitPriceHt: it.unitPriceHt || 0,
      discountRate: it.discountRate || 0,
      vatRate: it.vatRate || 20
    }))
    return calculateQuoteFinancials(rawItems, {
      discountType: form.discountType as any,
      discountValue: form.discountValue || 0
    })
  } catch {
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
})

const handleSubmit = () => {
  emit('submit', {
    clientId: form.clientId,
    issueDate: form.issueDate,
    dueDate: form.dueDate,
    subject: form.subject,
    discountType: form.discountType,
    discountValue: form.discountValue,
    paymentTerms: form.paymentTerms,
    publicNotes: form.publicNotes,
    internalNotes: form.internalNotes,
    items: form.items
  })
}
</script>
