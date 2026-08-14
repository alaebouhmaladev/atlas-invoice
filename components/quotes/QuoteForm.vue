<template>
  <form @submit.prevent="handleSubmit" class="space-y-8">
    <!-- General Error Banner -->
    <div
      v-if="generalError"
      class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3"
      role="alert"
    >
      <svg class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>{{ generalError }}</div>
    </div>

    <!-- SECTION 1: Informations Générales -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5">
      <div class="border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">1</span>
          Informations Générales du Devis
        </h3>
        <p class="text-xs text-slate-400 mt-1">Sélectionnez le client et définissez les dates d'émission et de validité.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Client Search Select -->
        <ClientSearchSelect
          v-model="form.clientId"
          :error="fieldErrors.clientId"
          :initial-client="initialData?.client"
          @select-client="handleSelectClient"
        />

        <!-- Subject / Objet -->
        <div>
          <label for="quote-subject" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Objet du devis</label>
          <input
            id="quote-subject"
            v-model="form.subject"
            type="text"
            placeholder="ex: Prestation Traiteur Cocktail Dînatoire"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <!-- Issue Date -->
        <div>
          <label for="issueDate" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Date d'émission *</label>
          <input
            id="issueDate"
            v-model="form.issueDate"
            type="date"
            required
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            :class="{ 'border-rose-500': fieldErrors.issueDate }"
          />
          <p v-if="fieldErrors.issueDate" class="text-rose-400 text-[11px] mt-1">{{ fieldErrors.issueDate }}</p>
        </div>

        <!-- Valid Until Date -->
        <div>
          <label for="validUntil" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Date de validité *</label>
          <input
            id="validUntil"
            v-model="form.validUntil"
            type="date"
            required
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            :class="{ 'border-rose-500': fieldErrors.validUntil }"
          />
          <p v-if="fieldErrors.validUntil" class="text-rose-400 text-[11px] mt-1">{{ fieldErrors.validUntil }}</p>
        </div>

        <!-- Payment Terms -->
        <div class="md:col-span-2">
          <label for="paymentTerms" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Conditions de paiement</label>
          <input
            id="paymentTerms"
            v-model="form.paymentTerms"
            type="text"
            placeholder="ex: 50% d'acompte à la commande, solde à la livraison"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
      </div>
    </div>

    <!-- SECTION 2: Lignes de Prestations -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6">
      <QuoteItemsEditor v-model:items="form.items" />
      <p v-if="fieldErrors.items" class="text-rose-400 text-[11px] mt-2">{{ fieldErrors.items }}</p>
    </div>

    <!-- SECTION 3: Remise globale & Récapitulatif -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Global Discount Options -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
          Remise Globale (Optionnelle)
        </h3>

        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-2">Type de remise globale</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="setGlobalDiscount(null)"
              class="py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center"
              :class="!form.discountType ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
            >
              Aucune
            </button>
            <button
              type="button"
              @click="setGlobalDiscount('PERCENTAGE')"
              class="py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center"
              :class="form.discountType === 'PERCENTAGE' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
            >
              Pourcentage %
            </button>
            <button
              type="button"
              @click="setGlobalDiscount('FIXED')"
              class="py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center"
              :class="form.discountType === 'FIXED' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
            >
              Montant Fixe (MAD)
            </button>
          </div>
        </div>

        <div v-if="form.discountType">
          <label for="discountValue" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            Valeur de la remise {{ form.discountType === 'PERCENTAGE' ? '(%)' : '(MAD HT)' }}
          </label>
          <input
            id="discountValue"
            v-model.number="form.discountValue"
            type="number"
            step="0.01"
            min="0"
            :max="form.discountType === 'PERCENTAGE' ? 100 : undefined"
            placeholder="0"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
      </div>

      <!-- Live Totals Component -->
      <QuoteTotals :totals="calculatedTotals" />
    </div>

    <!-- SECTION 4: Notes (Visibles et Internes) -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5">
      <div class="border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">3</span>
          Notes et Observations
        </h3>
        <p class="text-xs text-slate-400 mt-1">Saisissez les remarques destinées au client et les notes internes confidentielles.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="publicNotes" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Notes visibles sur le devis (PDF)</label>
          <textarea
            id="publicNotes"
            v-model="form.publicNotes"
            rows="3"
            placeholder="Remarques affichées au client sur le document PDF..."
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-y"
          ></textarea>
        </div>

        <div>
          <label for="internalNotes" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Notes internes (Non visibles sur le PDF)</label>
          <textarea
            id="internalNotes"
            v-model="form.internalNotes"
            rows="3"
            placeholder="Informations confidentielles pour l'équipe commerciale et cuisine..."
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-y"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex items-center justify-end gap-4 pt-4">
      <NuxtLink
        to="/devis"
        class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
      >
        Annuler
      </NuxtLink>

      <button
        type="submit"
        :disabled="loading"
        class="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
      >
        <svg v-if="loading" class="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ isEdit ? 'Mettre à jour le devis' : 'Enregistrer le devis' }}</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import ClientSearchSelect from '~/components/quotes/ClientSearchSelect.vue'
import QuoteItemsEditor, { type EditableItem } from '~/components/quotes/QuoteItemsEditor.vue'
import QuoteTotals from '~/components/quotes/QuoteTotals.vue'
import { calculateQuoteFinancials } from '~/server/utils/calculation'
import type { QuoteWithRelations } from '~/composables/useQuotes'
import type { DiscountType } from '@prisma/client'

const props = defineProps<{
  initialData?: QuoteWithRelations
  initialClientId?: string
  isEdit?: boolean
  loading?: boolean
  generalError?: string | null
}>()

const emit = defineEmits(['submit'])

// Helper dates
const today = new Date().toISOString().split('T')[0]
const defaultValidity = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const form = reactive({
  clientId: props.initialData?.clientId || props.initialClientId || '',
  issueDate: props.initialData?.issueDate ? new Date(props.initialData.issueDate).toISOString().split('T')[0] : today,
  validUntil: props.initialData?.validUntil ? new Date(props.initialData.validUntil).toISOString().split('T')[0] : defaultValidity,
  subject: props.initialData?.subject || '',
  discountType: (props.initialData?.discountType || null) as DiscountType | null,
  discountValue: props.initialData?.discountValue ? Number(props.initialData.discountValue) : null,
  paymentTerms: props.initialData?.paymentTerms || '50% d\'acompte à la commande, 50% à la livraison',
  publicNotes: props.initialData?.publicNotes || '',
  internalNotes: props.initialData?.internalNotes || '',
  items: (props.initialData?.items?.map((item) => ({
    position: item.position,
    title: item.title,
    description: item.description || '',
    quantity: Number(item.quantity),
    unit: item.unit,
    unitPriceHt: Number(item.unitPriceHt),
    discountRate: Number(item.discountRate),
    vatRate: Number(item.vatRate)
  })) || [
    {
      title: '',
      description: '',
      quantity: 1,
      unit: 'Service',
      unitPriceHt: 0,
      discountRate: 0,
      vatRate: 20
    }
  ]) as EditableItem[]
})

const fieldErrors = reactive<Record<string, string>>({})

function handleSelectClient() {
  delete fieldErrors.clientId
}

function setGlobalDiscount(type: DiscountType | null) {
  form.discountType = type
  if (!type) form.discountValue = null
}

const calculatedTotals = computed(() => {
  try {
    const rawItems = form.items.filter((i) => i.title.trim().length > 0 && i.quantity > 0)
    if (rawItems.length === 0) {
      return calculateQuoteFinancials([
        { title: 'Aperçu', quantity: 1, unit: 'Service', unitPriceHt: 0, discountRate: 0, vatRate: 20 }
      ])
    }
    return calculateQuoteFinancials(rawItems, {
      discountType: form.discountType,
      discountValue: form.discountValue
    })
  } catch {
    return calculateQuoteFinancials([
      { title: 'Aperçu', quantity: 1, unit: 'Service', unitPriceHt: 0, discountRate: 0, vatRate: 20 }
    ])
  }
})

function validateQuoteForm(): boolean {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key])
  let isValid = true

  if (!form.clientId) {
    fieldErrors.clientId = 'Veuillez sélectionner un client'
    isValid = false
  }

  if (!form.issueDate) {
    fieldErrors.issueDate = "La date d'émission est requise"
    isValid = false
  }

  if (!form.validUntil) {
    fieldErrors.validUntil = 'La date de validité est requise'
    isValid = false
  } else if (form.issueDate && new Date(form.validUntil) < new Date(form.issueDate)) {
    fieldErrors.validUntil = "La date de validité ne peut pas être antérieure à la date d'émission"
    isValid = false
  }

  const validItems = form.items.filter((i) => i.title.trim().length > 0 && i.quantity > 0)
  if (validItems.length === 0) {
    fieldErrors.items = 'Veuillez saisir au moins une ligne de prestation avec un titre et une quantité valide'
    isValid = false
  }

  return isValid
}

function handleSubmit() {
  if (!validateQuoteForm()) return
  emit('submit', { ...form })
}

watch(
  () => props.initialData,
  (newVal) => {
    if (newVal) {
      form.clientId = newVal.clientId
      form.issueDate = new Date(newVal.issueDate).toISOString().split('T')[0]
      form.validUntil = new Date(newVal.validUntil).toISOString().split('T')[0]
      form.subject = newVal.subject || ''
      form.discountType = newVal.discountType || null
      form.discountValue = newVal.discountValue ? Number(newVal.discountValue) : null
      form.paymentTerms = newVal.paymentTerms || ''
      form.publicNotes = newVal.publicNotes || ''
      form.internalNotes = newVal.internalNotes || ''
      if (newVal.items && newVal.items.length > 0) {
        form.items = newVal.items.map((item) => ({
          position: item.position,
          title: item.title,
          description: item.description || '',
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPriceHt: Number(item.unitPriceHt),
          discountRate: Number(item.discountRate),
          vatRate: Number(item.vatRate)
        }))
      }
    }
  },
  { immediate: true }
)
</script>
