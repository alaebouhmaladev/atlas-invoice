<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between border-b border-custom pb-3">
      <div>
        <h3 class="text-sm font-bold text-main uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-control bg-brand-soft text-brand-strong flex items-center justify-center text-xs font-bold border border-brand-soft">2</span>
          Lignes de facturation traiteur
        </h3>
        <p class="text-xs text-muted-custom mt-1">Ajoutez les prestations, quantités, prix unitaires, TVA et remises.</p>
      </div>

      <button
        type="button"
        @click="addItem"
        class="px-3.5 py-1.5 bg-brand-soft hover:bg-brand-strong/20 text-brand-strong border border-brand-soft rounded-pill text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Ajouter une ligne</span>
      </button>
    </div>

    <!-- Items List -->
    <div class="space-y-4">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="bg-panel border border-custom rounded-card p-4 space-y-3 relative group transition-all shadow-soft"
      >
        <!-- Top bar of line item -->
        <div class="flex items-center justify-between bg-panel-raised px-3 py-1.5 rounded-control border border-custom">
          <span class="text-xs font-bold text-brand-strong">Ligne #{{ index + 1 }}</span>

          <div class="flex items-center gap-1">
            <button
              type="button"
              @click="moveUp(index)"
              :disabled="index === 0"
              class="p-1 text-muted-custom hover:text-main disabled:opacity-30 cursor-pointer"
              title="Monter"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
            </button>

            <button
              type="button"
              @click="moveDown(index)"
              :disabled="index === items.length - 1"
              class="p-1 text-muted-custom hover:text-main disabled:opacity-30 cursor-pointer"
              title="Descendre"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              type="button"
              @click="removeItem(index)"
              :disabled="items.length <= 1"
              class="p-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 disabled:opacity-30 cursor-pointer"
              title="Supprimer la ligne"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
          <!-- Title & Description -->
          <div class="md:col-span-6 space-y-2">
            <div>
              <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Désignation *</label>
              <input
                v-model="item.title"
                type="text"
                required
                placeholder="Ex: Buffet Cocktail Prestige (150 personnes)"
                class="w-full py-1.5 px-3 text-xs rounded-control bg-panel-raised border border-custom text-main placeholder-muted-custom focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Description (optionnelle)</label>
              <textarea
                v-model="item.description"
                rows="2"
                placeholder="Détails du menu, pièces salées/sucrées..."
                class="w-full py-1.5 px-3 text-xs rounded-control bg-panel-raised border border-custom text-main placeholder-muted-custom focus:outline-none focus:border-brand"
              ></textarea>
            </div>
          </div>

          <!-- Quantity, Unit, Price, VAT, Discount -->
          <div class="md:col-span-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Quantité *</label>
              <input
                v-model.number="item.quantity"
                type="number"
                step="any"
                min="0.001"
                required
                class="w-full py-1.5 px-2.5 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand text-right font-mono"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Unité</label>
              <select
                v-model="item.unit"
                class="w-full py-1.5 px-2.5 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand"
              >
                <option value="Personne">Personne</option>
                <option value="Forfait">Forfait</option>
                <option value="Heure">Heure</option>
                <option value="Jour">Jour</option>
                <option value="Unité">Unité</option>
                <option value="Kg">Kg</option>
                <option value="Plateau">Plateau</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">P.U. HT (MAD) *</label>
              <input
                v-model.number="item.unitPriceHt"
                type="number"
                step="any"
                min="0"
                required
                class="w-full py-1.5 px-2.5 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand text-right font-mono"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Taux TVA (%)</label>
              <select
                v-model.number="item.vatRate"
                class="w-full py-1.5 px-2.5 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand font-mono"
              >
                <option :value="20">20%</option>
                <option :value="14">14%</option>
                <option :value="10">10%</option>
                <option :value="7">7%</option>
                <option :value="0">0%</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Remise (%)</label>
              <input
                v-model.number="item.discountRate"
                type="number"
                step="any"
                min="0"
                max="100"
                class="w-full py-1.5 px-2.5 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand text-right font-mono"
              />
            </div>

            <div class="col-span-2 sm:col-span-1 flex flex-col justify-end">
              <span class="text-xs text-muted-custom uppercase tracking-wider mb-1">Total TTC</span>
              <div class="py-1.5 px-2.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-panel-raised rounded-control border border-custom text-right">
                {{ formatMoney(getItemTtc(item)) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatMoney, calculateQuoteFinancials } from '~/server/utils/calculation'

export interface FactureFormItem {
  id?: string
  title: string
  description?: string
  quantity: number
  unit: string
  unitPriceHt: number
  discountRate: number
  vatRate: number
}

const props = defineProps<{
  items: FactureFormItem[]
}>()

const emit = defineEmits(['update:items'])

const addItem = () => {
  const updated = [
    ...props.items,
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
  emit('update:items', updated)
}

const removeItem = (index: number) => {
  if (props.items.length <= 1) return
  const updated = props.items.filter((_, i) => i !== index)
  emit('update:items', updated)
}

const moveUp = (index: number) => {
  if (index === 0) return
  const updated = [...props.items]
  const temp = updated[index - 1]
  updated[index - 1] = updated[index]
  updated[index] = temp
  emit('update:items', updated)
}

const moveDown = (index: number) => {
  if (index === props.items.length - 1) return
  const updated = [...props.items]
  const temp = updated[index + 1]
  updated[index + 1] = updated[index]
  updated[index] = temp
  emit('update:items', updated)
}

const getItemTtc = (item: FactureFormItem) => {
  try {
    const calc = calculateQuoteFinancials([
      {
        title: item.title || 'Prestation',
        unit: item.unit || 'Personne',
        quantity: item.quantity || 0,
        unitPriceHt: item.unitPriceHt || 0,
        discountRate: item.discountRate || 0,
        vatRate: item.vatRate || 20
      }
    ])
    return calc.totalTtc
  } catch {
    return '0.00'
  }
}
</script>
