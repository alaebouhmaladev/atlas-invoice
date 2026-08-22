<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-semibold text-brand">Paie</p>
      <h1 class="text-2xl font-bold text-main">Variables de paie</h1>
      <p class="mt-1 text-sm text-secondary-custom">
        Primes, heures supplémentaires et retenues ponctuelles avec approbation.
      </p>
    </header>
    <AppCard
      ><div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-main">Variables récentes</h2>
        <span class="text-sm text-muted-custom">{{ variables.length }} élément(s)</span>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="min-w-[720px] w-full text-sm">
          <thead>
            <tr class="border-b border-custom text-left text-muted-custom">
              <th class="p-3">Composant</th>
              <th class="p-3">Source</th>
              <th class="p-3">Montant</th>
              <th class="p-3">Statut</th>
              <th class="p-3">Créée le</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in variables" :key="item.id" class="border-b border-custom">
              <td class="p-3 text-main">{{ item.componentDefinition.name }}</td>
              <td class="p-3 text-secondary-custom">{{ sourceLabel(item.source) }}</td>
              <td class="p-3 font-semibold text-main">{{ formatMoney(item.amount) }}</td>
              <td class="p-3"><AppStatusBadge :status="item.status" :label="statusLabel(item.status)" /></td>
              <td class="p-3 text-muted-custom">{{ new Date(item.createdAt).toLocaleDateString('fr-MA') }}</td>
            </tr>
            <tr v-if="!variables.length">
              <td colspan="5" class="p-8 text-center text-muted-custom">Aucune variable enregistrée.</td>
            </tr>
          </tbody>
        </table>
      </div></AppCard
    >
  </div>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { formatMoney, statusLabel } = useHrPayroll()
const variables = await $fetch<any[]>('/api/rh/paie/variables')
const sourceLabel = (source: string) =>
  ({ MANUAL: 'Saisie manuelle', ATTENDANCE: 'Pointage', LEAVE: 'Congé', IMPORT: 'Import' })[source] ||
  'Source contrôlée'
</script>
