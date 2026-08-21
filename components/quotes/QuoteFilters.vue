<template>
  <div class="bg-panel border border-custom rounded-panel p-4 space-y-4 shadow-soft">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- Search Input -->
      <div class="relative">
        <label for="search-quote-input" class="sr-only">Rechercher un devis</label>
        <input
          id="search-quote-input"
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par n° devis, objet, client, ICE, IF..."
          class="w-full pl-10 pr-4 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main placeholder-muted-custom focus:outline-none focus:border-brand"
        />
        <svg class="w-4 h-4 text-muted-custom absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <!-- Status Filter -->
      <div>
        <label for="status-quote-select" class="sr-only">Statut du devis</label>
        <select
          id="status-quote-select"
          v-model="selectedStatus"
          class="w-full px-3.5 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
        >
          <option value="all">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="SENT">Envoyé</option>
          <option value="ACCEPTED">Accepté</option>
          <option value="REJECTED">Refusé</option>
          <option value="EXPIRED">Expiré</option>
          <option value="CONVERTED">Converti en facture</option>
        </select>
      </div>

      <!-- Archive Status Filter -->
      <div>
        <label for="archive-quote-select" class="sr-only">Statut d'archivage</label>
        <select
          id="archive-quote-select"
          v-model="selectedArchiveStatus"
          class="w-full px-3.5 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
        >
          <option value="active">Actifs uniquement</option>
          <option value="archived">Archivés uniquement</option>
          <option value="all">Tous les devis</option>
        </select>
      </div>

      <!-- Reset Action -->
      <div class="flex items-center justify-end">
        <button
          v-if="hasActiveFilters"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { QuoteStatus } from '@prisma/client'

const props = defineProps<{
  search?: string
  status?: QuoteStatus | 'all'
  archiveStatus?: 'active' | 'archived' | 'all'
}>()

const emit = defineEmits(['update:filters'])

const searchQuery = ref(props.search || '')
const selectedStatus = ref<QuoteStatus | 'all'>(props.status || 'all')
const selectedArchiveStatus = ref<'active' | 'archived' | 'all'>(props.archiveStatus || 'active')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const hasActiveFilters = computed(() => {
  return searchQuery.value !== '' || selectedStatus.value !== 'all' || selectedArchiveStatus.value !== 'active'
})

function emitFilters() {
  emit('update:filters', {
    search: searchQuery.value || undefined,
    status: selectedStatus.value,
    archiveStatus: selectedArchiveStatus.value
  })
}

watch(searchQuery, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emitFilters()
  }, 350)
})

watch([selectedStatus, selectedArchiveStatus], () => {
  emitFilters()
})

function resetFilters() {
  searchQuery.value = ''
  selectedStatus.value = 'all'
  selectedArchiveStatus.value = 'active'
  emitFilters()
}
</script>
