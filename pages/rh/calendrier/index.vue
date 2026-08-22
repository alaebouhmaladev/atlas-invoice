<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-[.18em] text-brand-strong">Calendriers configurables</p><h1 class="mt-1 text-2xl font-bold text-main">Jours fériés & fermetures</h1><p class="mt-1 text-xs text-secondary-custom">Aucune date variable n’est créée automatiquement. Chaque journée est validée et enregistrée explicitement.</p></div><NuxtLink to="/rh/conges/parametres" class="rounded-control border border-custom bg-panel-raised px-4 py-2 text-xs font-bold text-main">Configurer</NuxtLink></header>
    <div v-if="error" role="alert" class="rounded-card border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{{ error }}</div>
    <div v-if="loading" class="rounded-panel border border-custom bg-panel p-12 text-center text-muted-custom">Chargement…</div>
    <div v-else class="grid gap-5 xl:grid-cols-2"><section v-for="calendar in calendars" :key="calendar.id" class="rounded-panel border border-custom bg-panel p-5 shadow-soft"><div class="flex items-start justify-between"><div><h2 class="text-base font-bold text-main">{{ calendar.name }}</h2><p class="font-mono text-xs text-muted-custom">{{ calendar.code }} · {{ calendar.timezone }}</p></div><span v-if="calendar.isDefault" class="rounded-pill bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">Par défaut</span></div><div class="mt-4 space-y-2"><div v-for="holiday in calendar.holidays" :key="holiday.id" class="flex items-center justify-between rounded-card border border-custom bg-panel-raised p-3"><div><p class="text-xs font-bold text-main">{{ holiday.name }}</p><p class="font-mono text-xs text-muted-custom">{{ formatDate(holiday.localDate) }}</p></div><span class="text-xs font-bold" :class="holiday.isWorkingDay ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'">{{ holiday.isWorkingDay ? 'Ouvré' : 'Non ouvré' }}</span></div><p v-if="!calendar.holidays.length" class="py-5 text-center text-xs text-muted-custom">Aucune date configurée.</p></div></section><div v-if="!calendars.length" class="rounded-panel border border-dashed border-custom p-12 text-center text-muted-custom xl:col-span-2">Aucun calendrier actif.</div></div>
  </div>
</template>
<script setup lang="ts">
useHead({ title: 'Calendrier des jours fériés' })
definePageMeta({ middleware: 'auth' })
const { calendars, loading, error, fetchCalendars } = useHrLeave()
const formatDate = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
onMounted(() => fetchCalendars().catch(() => undefined))
</script>
