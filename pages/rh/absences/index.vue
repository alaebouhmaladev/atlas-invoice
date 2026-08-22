<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-[.18em] text-brand-strong">Présence & justification</p><h1 class="mt-1 text-2xl font-bold text-main">Absences détectées</h1><p class="mt-1 text-xs text-secondary-custom">Les informations médicales et motifs privés ne sont jamais affichés dans cette vue opérationnelle.</p></div><NuxtLink to="/rh/conges" class="text-xs font-bold text-brand-strong">Congés & validations →</NuxtLink></header>
    <div class="grid gap-4 sm:grid-cols-3"><div class="metric"><span>Non justifiées</span><strong>{{ count('UNJUSTIFIED') }}</strong></div><div class="metric"><span>Justifiées</span><strong>{{ count('JUSTIFIED') }}</strong></div><div class="metric"><span>Résolues</span><strong>{{ count('RESOLVED') }}</strong></div></div>
    <div v-if="error" role="alert" class="rounded-card border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{{ error }}</div>
    <AppTable :empty="!loading && !absences.length"><template #header><tr><th class="px-5 py-4">Collaborateur</th><th class="px-5 py-4">Site</th><th class="px-5 py-4">Date</th><th class="px-5 py-4">Origine</th><th class="px-5 py-4">Statut</th></tr></template><tr v-if="loading"><td colspan="5" class="px-5 py-12 text-center text-muted-custom">Chargement…</td></tr><tr v-for="absence in absences" :key="absence.id" class="hover:bg-surface-hover"><td class="px-5 py-4"><strong class="text-main">{{ absence.employee.displayName }}</strong><span class="block font-mono text-xs text-muted-custom">{{ absence.employee.employeeNumber }}</span></td><td class="px-5 py-4 text-secondary-custom">{{ absence.site.name }}</td><td class="px-5 py-4 font-mono">{{ formatDate(absence.localDate) }}</td><td class="px-5 py-4 text-xs text-secondary-custom">{{ sourceLabel(absence.source) }}</td><td class="px-5 py-4"><AppStatusBadge :status="absence.status" /></td></tr><template #empty><p>Aucune absence détectée.</p></template></AppTable>
  </div>
</template>
<script setup lang="ts">
import AppStatusBadge from '~/components/ui/AppStatusBadge.vue'
import AppTable from '~/components/ui/AppTable.vue'
import { formatAbsenceSource } from '~/utils/hrLeaveFormatters'
useHead({ title: 'Absences détectées' })
definePageMeta({ middleware: 'auth' })
const { absences, loading, error, fetchAbsences } = useHrLeave()
const count = (status: string) => absences.value.filter(item => item.status === status).length
const formatDate = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
const sourceLabel = formatAbsenceSource
onMounted(() => fetchAbsences().catch(() => undefined))
</script>
<style scoped>
.metric { @apply p-5; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--panel); box-shadow: 0 4px 20px -2px rgb(0 0 0 / 5%); }
.metric span { @apply text-xs font-bold uppercase tracking-wider; color: var(--text-muted); }
.metric strong { @apply mt-2 block font-mono text-3xl; color: var(--text); }
</style>
