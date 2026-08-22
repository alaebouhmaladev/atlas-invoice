<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-semibold text-brand">Paramètres de paie</p>
      <h1 class="text-2xl font-bold text-main">Composants salariaux</h1>
      <p class="mt-1 text-sm text-secondary-custom">Définitions effectives et mappings comptables configurables.</p>
    </header>
    <AppCard
      ><div class="overflow-x-auto">
        <table class="min-w-[760px] w-full text-sm">
          <thead>
            <tr class="border-b border-custom text-left text-muted-custom">
              <th class="p-3">Code</th>
              <th class="p-3">Libellé</th>
              <th class="p-3">Nature</th>
              <th class="p-3">Calcul</th>
              <th class="p-3">Fiscal</th>
              <th class="p-3">Ordre</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in components" :key="item.id" class="border-b border-custom">
              <td class="p-3 font-mono text-main">{{ item.code }}</td>
              <td class="p-3 font-medium text-main">{{ item.name }}</td>
              <td class="p-3 text-secondary-custom">{{ kindLabel(item.kind) }}</td>
              <td class="p-3 text-secondary-custom">{{ modeLabel(item.mode) }}</td>
              <td class="p-3 text-secondary-custom">{{ item.taxable ? 'Imposable' : 'Non imposable' }}</td>
              <td class="p-3 text-main">{{ item.calculationOrder }}</td>
            </tr>
            <tr v-if="!components.length">
              <td colspan="6" class="p-8 text-center text-muted-custom">Aucun composant configuré.</td>
            </tr>
          </tbody>
        </table>
      </div></AppCard
    >
  </div>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const components = await $fetch<any[]>('/api/rh/paie/composants')
const kindLabel = (v: string) =>
  ({
    EARNING: 'Gain',
    DEDUCTION: 'Retenue',
    EMPLOYER_CONTRIBUTION: 'Cotisation employeur',
    REIMBURSEMENT: 'Remboursement'
  })[v] || 'Autre'
const modeLabel = (v: string) =>
  ({ FIXED: 'Fixe', VARIABLE: 'Variable', PERCENTAGE: 'Pourcentage', QUANTITY_RATE: 'Quantité × taux' })[v] ||
  'Configuré'
</script>
