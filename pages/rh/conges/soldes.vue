<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-[.18em] text-brand-strong">Compte de droits</p><h1 class="mt-1 text-2xl font-bold text-main">Soldes de congés</h1><p class="mt-1 text-xs text-secondary-custom">Chaque mouvement est conservé dans un registre immuable et compensé par une nouvelle écriture.</p></div><NuxtLink to="/rh/conges" class="text-xs font-bold text-brand-strong">← Demandes</NuxtLink></header>
    <div class="rounded-card border border-custom bg-panel-raised p-4 text-xs text-secondary-custom"><strong class="text-main">Lecture :</strong> disponible = ouverture + acquisitions + ajustements − réservations − consommations − expirations.</div>
    <div v-if="error" role="alert" class="rounded-card border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{{ error }}</div>
    <AppTable :empty="!loading && !balances.length">
      <template #header><tr><th class="px-5 py-4">Collaborateur</th><th class="px-5 py-4">Type</th><th class="px-5 py-4">Période</th><th class="px-5 py-4">Réservé</th><th class="px-5 py-4">Consommé</th><th class="px-5 py-4 text-right">Disponible</th></tr></template>
      <tr v-if="loading"><td colspan="6" class="px-5 py-12 text-center text-muted-custom">Chargement des soldes…</td></tr>
      <tr v-for="balance in balances" :key="balance.id" class="hover:bg-surface-hover"><td class="px-5 py-4"><strong class="text-main">{{ balance.employee.displayName }}</strong><span class="block font-mono text-xs text-muted-custom">{{ balance.employee.employeeNumber }}</span></td><td class="px-5 py-4 font-semibold text-secondary-custom">{{ balance.leaveType.name }}</td><td class="px-5 py-4 font-mono text-secondary-custom">{{ year(balance.periodStart) }}</td><td class="px-5 py-4 font-mono">{{ hours(balance.reservedMinutes) }}</td><td class="px-5 py-4 font-mono">{{ hours(balance.consumedMinutes) }}</td><td class="px-5 py-4 text-right font-mono text-lg font-black text-brand-strong">{{ hours(balance.availableMinutes) }}</td></tr>
      <template #empty><p>Aucun solde n’a encore été ouvert. Les droits sont créés par une acquisition ou un ajustement explicite.</p></template>
    </AppTable>
  </div>
</template>
<script setup lang="ts">
import AppTable from '~/components/ui/AppTable.vue'
useHead({ title: 'Soldes de congés' })
definePageMeta({ middleware: 'auth' })
const { balances, loading, error, fetchBalances } = useHrLeave()
const hours = (minutes: number) => `${(minutes / 60).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h`
const year = (value: string) => new Date(value).getUTCFullYear()
onMounted(() => fetchBalances().catch(() => undefined))
</script>
