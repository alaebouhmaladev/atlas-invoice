<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between border-b border-custom pb-3">
      <div>
        <h3 class="text-sm font-bold text-main uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-control bg-brand-soft text-brand-strong flex items-center justify-center text-xs font-bold border border-brand-soft">2</span>
          Lignes de prestations traiteur
        </h3>
        <p class="text-xs text-muted-custom mt-1">Ajoutez les détails des prestations, quantités, prix unitaires et remises.</p>
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
        <!-- Top bar of line item: Position, Reorder & Delete -->
        <div class="flex items-center justify-between bg-panel-raised px-3 py-1.5 rounded-control border border-custom">
          <span class="text-xs font-bold text-brand-strong">Ligne #{{ index + 1 }}</span>

          <div class="flex items-center gap-1">
            <button
              type="button"
              @click="moveUp(index)"
              :disabled="index === 0"
              class="p-1 text-muted-custom hover:text-main disabled:opacity-30 disabled:hover:text-muted-custom cursor-pointer"
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
              class="p-1 text-muted-custom hover:text-main disabled:opacity-30 disabled:hover:text-muted-custom cursor-pointer"
              title="Descendre"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              type="button"
              @click="duplicateItem(index)"
              class="p-1 text-muted-custom hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
              title="Dupliquer la ligne"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            <button
              type="button"
              @click="removeItem(index)"
              :disabled="items.length <= 1"
              class="p-1 text-muted-custom hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 cursor-pointer"
              title="Supprimer la ligne"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Form fields grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <!-- Designation (Title) -->
          <div class="lg:col-span-2">
            <label :for="`item-title-${index}`" class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Désignation *</label>
            <input
              :id="`item-title-${index}`"
              v-model="item.title"
              type="text"
              required
              placeholder="ex: Cocktail Traiteur 50p"
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>

          <!-- Quantity -->
          <div>
            <label :for="`item-qty-${index}`" class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Quantité *</label>
            <input
              :id="`item-qty-${index}`"
              v-model.number="item.quantity"
              type="number"
              step="0.001"
              min="0.001"
              required
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>

          <!-- Unit Selector -->
          <div>
            <label :for="`item-unit-${index}`" class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Unité *</label>
            <select
              :id="`item-unit-${index}`"
              v-model="item.unit"
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            >
              <option value="Service">Service</option>
              <option value="Personne">Personne</option>
              <option value="Repas">Repas</option>
              <option value="Jour">Jour</option>
              <option value="Heure">Heure</option>
              <option value="Unité">Unité</option>
              <option value="Forfait">Forfait</option>
              <option value="Plateau">Plateau</option>
              <option value="Livraison">Livraison</option>
              <option value="Mois">Mois</option>
            </select>
          </div>

          <!-- Unit Price HT -->
          <div>
            <label :for="`item-price-${index}`" class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">P.U. HT (MAD) *</label>
            <input
              :id="`item-price-${index}`"
              v-model.number="item.unitPriceHt"
              type="number"
              step="0.01"
              min="0"
              required
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>

          <!-- Remise % -->
          <div>
            <label :for="`item-disc-${index}`" class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Remise %</label>
            <input
              :id="`item-disc-${index}`"
              v-model.number="item.discountRate"
              type="number"
              step="0.1"
              min="0"
              max="100"
              class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <!-- Description & TVA -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div class="sm:col-span-3">
            <label :for="`item-desc-${index}`" class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Description / Détails prestation</label>
            <input
              :id="`item-desc-${index}`"
              v-model="item.description"
              type="text"
              placeholder="ex: Amuse-bouches salés et sucrés, boissons fraîches incluses"
              class="w-full px-3 py-1.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label :for="`item-vat-${index}`" class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Taux TVA</label>
            <select
              :id="`item-vat-${index}`"
              v-model.number="item.vatRate"
              class="w-full px-3 py-1.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            >
              <option :value="20">20% (Standard)</option>
              <option :value="14">14% (Transport)</option>
              <option :value="10">10% (Restauration)</option>
              <option :value="7">7% (Eau/Produits)</option>
              <option :value="0">0% (Exonéré)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface EditableItem {
  position?: number
  title: string
  description?: string | null
  quantity: number
  unit: string
  unitPriceHt: number
  discountRate: number
  vatRate: number
}

const props = defineProps<{
  items: EditableItem[]
}>()

const emit = defineEmits(['update:items'])

function addItem() {
  const newItems = [
    ...props.items,
    {
      title: '',
      description: '',
      quantity: 1,
      unit: 'Service',
      unitPriceHt: 0,
      discountRate: 0,
      vatRate: 20
    }
  ]
  emit('update:items', newItems)
}

function removeItem(index: number) {
  if (props.items.length <= 1) return
  const newItems = props.items.filter((_, i) => i !== index)
  emit('update:items', newItems)
}

function duplicateItem(index: number) {
  const target = props.items[index]
  const newItems = [
    ...props.items.slice(0, index + 1),
    { ...target, title: `${target.title} (Copie)` },
    ...props.items.slice(index + 1)
  ]
  emit('update:items', newItems)
}

function moveUp(index: number) {
  if (index === 0) return
  const newItems = [...props.items]
  const temp = newItems[index - 1]
  newItems[index - 1] = newItems[index]
  newItems[index] = temp
  emit('update:items', newItems)
}

function moveDown(index: number) {
  if (index === props.items.length - 1) return
  const newItems = [...props.items]
  const temp = newItems[index + 1]
  newItems[index + 1] = newItems[index]
  newItems[index] = temp
  emit('update:items', newItems)
}
</script>
