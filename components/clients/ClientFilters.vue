<template>
  <div class="bg-panel border border-custom rounded-panel p-4 space-y-4 shadow-soft">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- Search Input -->
      <div class="relative">
        <label for="search-input" class="sr-only">Rechercher un client</label>
        <input
          id="search-input"
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par nom, ICE, IF, email, tél, ville..."
          class="w-full pl-10 pr-4 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main placeholder-muted-custom focus:outline-none focus:border-brand"
        />
        <svg class="w-4 h-4 text-muted-custom absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Type Filter -->
      <div>
        <label for="type-select" class="sr-only">Type de client</label>
        <select
          id="type-select"
          v-model="selectedType"
          class="w-full px-3.5 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
        >
          <option value="">Tous les types</option>
          <option value="COMPANY">Entreprise</option>
          <option value="INDIVIDUAL">Particulier</option>
        </select>
      </div>

      <!-- City Filter -->
      <div>
        <label for="city-select" class="sr-only">Ville</label>
        <select
          id="city-select"
          v-model="selectedCity"
          class="w-full px-3.5 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
        >
          <option value="">Toutes les villes</option>
          <option value="Casablanca">Casablanca</option>
          <option value="Rabat">Rabat</option>
          <option value="Marrakech">Marrakech</option>
          <option value="Tanger">Tanger</option>
          <option value="Agadir">Agadir</option>
          <option value="Fès">Fès</option>
          <option value="Meknès">Meknès</option>
          <option value="Oujda">Oujda</option>
        </select>
      </div>

      <!-- Status Filter -->
      <div>
        <label for="status-select" class="sr-only">Statut</label>
        <select
          id="status-select"
          v-model="selectedStatus"
          class="w-full px-3.5 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
        >
          <option value="active">Actifs uniquement</option>
          <option value="archived">Archivés uniquement</option>
          <option value="all">Tous les statuts</option>
        </select>
      </div>
    </div>

    <!-- Reset Button -->
    <div v-if="hasActiveFilters" class="flex justify-end pt-1">
      <button
        type="button"
        @click="resetFilters"
        class="text-xs text-brand-strong hover:text-brand font-bold flex items-center gap-1 transition-colors cursor-pointer"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Réinitialiser les filtres</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ClientType } from '@prisma/client'

const props = defineProps<{
  search?: string
  type?: ClientType | '' | undefined
  city?: string
  status?: 'active' | 'archived' | 'all'
}>()

const emit = defineEmits(['update:filters'])

const searchQuery = ref(props.search || '')
const selectedType = ref<ClientType | ''>(props.type || '')
const selectedCity = ref(props.city || '')
const selectedStatus = ref<'active' | 'archived' | 'all'>(props.status || 'active')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const hasActiveFilters = computed(() => {
  return searchQuery.value !== '' || selectedType.value !== '' || selectedCity.value !== '' || selectedStatus.value !== 'active'
})

function emitFilters() {
  emit('update:filters', {
    search: searchQuery.value || undefined,
    type: selectedType.value || undefined,
    city: selectedCity.value || undefined,
    status: selectedStatus.value
  })
}

watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emitFilters()
  }, 350)
})

watch([selectedType, selectedCity, selectedStatus], () => {
  emitFilters()
})

function resetFilters() {
  searchQuery.value = ''
  selectedType.value = ''
  selectedCity.value = ''
  selectedStatus.value = 'active'
  emitFilters()
}
</script>
