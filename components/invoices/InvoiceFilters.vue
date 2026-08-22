<template>
  <div class="bg-panel border border-custom rounded-panel p-4 shadow-soft space-y-4">
    <!-- Top Row: Search & Client & Status Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div class="md:col-span-2 relative">
        <input
          v-model="search"
          type="text"
          placeholder="Rechercher par N° facture, client, objet, ICE..."
          class="w-full pl-10 pr-4 py-2 text-xs rounded-control bg-panel-raised border border-custom text-main placeholder-muted-custom focus:outline-none focus:border-brand transition-colors"
          @input="emitChange"
        />
        <svg class="w-4 h-4 text-muted-custom absolute left-3.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      <div>
        <select
          v-model="clientId"
          class="w-full py-2 px-3 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand"
          @change="emitChange"
        >
          <option value="">Tous les clients</option>
          <option v-for="client in clients" :key="client.id" :value="client.id">
            {{ client.displayName }}
          </option>
        </select>
      </div>

      <div>
        <select
          v-model="status"
          class="w-full py-2 px-3 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand"
          @change="emitChange"
        >
          <option value="all">Tous les statuts</option>
          <option value="DRAFT">Brouillons</option>
          <option value="FINALIZED">Finalisées</option>
          <option value="CANCELLED">Annulées</option>
        </select>
      </div>
    </div>

    <!-- Secondary Filters Row -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-custom">
      <div>
        <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Règlement</label>
        <select
          v-model="paymentStatus"
          class="w-full py-1.5 px-2.5 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand"
          @change="emitChange"
        >
          <option value="all">Tous les règlements</option>
          <option value="UNPAID">Impayées</option>
          <option value="PARTIALLY_PAID">Partiellement payées</option>
          <option value="PAID">Payées</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Origine</label>
        <select
          v-model="source"
          class="w-full py-1.5 px-2.5 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand"
          @change="emitChange"
        >
          <option value="all">Toutes les sources</option>
          <option value="quote">Issues de devis</option>
          <option value="direct">Directes</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Archives</label>
        <select
          v-model="archiveStatus"
          class="w-full py-1.5 px-2.5 text-xs rounded-control bg-panel-raised border border-custom text-main focus:outline-none focus:border-brand"
          @change="emitChange"
        >
          <option value="active">Actives uniquement</option>
          <option value="archived">Archivées uniquement</option>
          <option value="all">Toutes (Actives + Archivées)</option>
        </select>
      </div>

      <div class="flex items-end">
        <label class="inline-flex items-center gap-2 cursor-pointer py-1 text-xs text-main font-semibold">
          <input
            v-model="overdue"
            type="checkbox"
            class="rounded border-custom bg-panel-raised text-brand focus:ring-brand h-4 w-4"
            @change="emitChange"
          />
          <span class="text-rose-600 dark:text-rose-400 font-bold">Factures en retard uniquement</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  clients: Array<{ id: string; displayName: string }>
}>()

const emit = defineEmits(['update:filters'])

const search = ref('')
const clientId = ref('')
const status = ref('all')
const paymentStatus = ref('all')
const overdue = ref(false)
const source = ref('all')
const archiveStatus = ref('active')

const emitChange = () => {
  emit('update:filters', {
    search: search.value,
    clientId: clientId.value,
    status: status.value,
    paymentStatus: paymentStatus.value,
    overdue: overdue.value,
    source: source.value,
    archiveStatus: archiveStatus.value
  })
}
</script>
