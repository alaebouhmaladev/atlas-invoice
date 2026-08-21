<template>
  <div class="space-y-1 relative">
    <div class="flex items-center justify-between">
      <label for="client-select" class="block text-xs font-bold text-muted-custom uppercase tracking-wider">Client *</label>
      <NuxtLink
        to="/clients/new"
        target="_blank"
        class="text-[11px] text-brand-strong hover:text-brand font-bold flex items-center gap-1"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>Créer un client (nouveau me)</span>
      </NuxtLink>
    </div>

    <!-- Client Dropdown Selector -->
    <div class="relative">
      <select
        id="client-select"
        v-model="selectedClientId"
        required
        class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
        :class="{ 'border-rose-500': error }"
      >
        <option value="" disabled>Sélectionner un client dans la liste...</option>
        <option v-for="client in clientOptions" :key="client.id" :value="client.id">
          {{ client.displayName }} {{ client.ice ? `(ICE: ${client.ice})` : '' }} {{ client.city ? `— ${client.city}` : '' }}
        </option>
      </select>
    </div>
    <p v-if="error" class="text-rose-600 dark:text-rose-400 text-[11px] mt-1 font-bold">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { ClientWithUser } from '~/composables/useClients'

const props = defineProps<{
  modelValue?: string
  error?: string
  initialClient?: { id: string; displayName: string } | null
}>()

const emit = defineEmits(['update:modelValue', 'select-client'])

const { clients, fetchClients } = useClients()

const selectedClientId = computed({
  get: () => props.modelValue || '',
  set: (val: string) => {
    emit('update:modelValue', val)
    const selected = clients.value.find((c) => c.id === val)
    if (selected) emit('select-client', selected)
  }
})

const clientOptions = computed(() => {
  if (props.initialClient && !clients.value.some((c) => c.id === props.initialClient?.id)) {
    return [
      { id: props.initialClient.id, displayName: props.initialClient.displayName, ice: null, city: null } as unknown as ClientWithUser,
      ...clients.value
    ]
  }
  return clients.value
})

onMounted(() => {
  fetchClients({ pageSize: 100, status: 'active' })
})
</script>
