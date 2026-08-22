<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-xs font-bold uppercase tracking-[.18em] text-brand-strong">Vue calendrier</p><h1 class="mt-1 text-2xl font-bold text-main">Congés & jours fériés</h1><p class="mt-1 text-xs text-secondary-custom">Les motifs confidentiels ne sont jamais affichés dans cette vue d’équipe.</p></div><NuxtLink to="/rh/conges" class="text-xs font-bold text-brand-strong">← Demandes</NuxtLink></header>
    <div v-if="error" role="alert" class="rounded-card border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">{{ error }}</div>
    <div v-if="loading" class="rounded-panel border border-custom bg-panel p-12 text-center text-muted-custom">Chargement…</div>
    <div v-else class="grid gap-5 xl:grid-cols-2"><section v-for="calendar in calendars" :key="calendar.id" class="rounded-panel border border-custom bg-panel p-5 shadow-soft"><div class="flex items-start justify-between"><div><h2 class="font-bold text-main">{{ calendar.name }}</h2><p class="font-mono text-xs text-muted-custom">{{ calendar.code }} · {{ calendar.timezone }}</p></div><span v-if="calendar.isDefault" class="rounded-pill bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">Par défaut</span></div><ul class="mt-4 space-y-2"><li v-for="holiday in calendar.holidays" :key="holiday.id" class="flex items-center justify-between rounded-card border border-custom bg-panel-raised p-3"><span><strong class="block text-xs text-main">{{ holiday.name }}</strong><span class="font-mono text-xs text-muted-custom">{{ date(holiday.localDate) }}</span></span><span class="text-xs font-bold">{{ holiday.isWorkingDay ? 'Ouvré' : 'Non ouvré' }}</span></li></ul></section><p v-if="!calendars.length" class="rounded-panel border border-dashed border-custom p-12 text-center text-muted-custom xl:col-span-2">Aucun calendrier actif.</p></div>
  </div>
</template>
<script setup lang="ts">
useHead({ title: 'Calendrier des congés' }); definePageMeta({ middleware: 'auth' })
const { calendars, loading, error, fetchCalendars } = useHrLeave()
const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
onMounted(() => fetchCalendars().catch(() => undefined))
</script>
