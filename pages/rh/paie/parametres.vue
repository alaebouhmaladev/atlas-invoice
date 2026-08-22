<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-semibold text-brand">Paie</p>
      <h1 class="text-2xl font-bold text-main">Paramètres de paie</h1>
      <p class="mt-1 text-sm text-secondary-custom">Règles effectives, arrondis, proratisation et exports.</p>
    </header>
    <div
      v-if="settings.warning"
      role="alert"
      class="rounded-xl border border-danger bg-danger-soft p-4 text-sm text-danger"
    >
      <strong>Clôture bloquée.</strong> {{ settings.warning }}
    </div>
    <div class="grid gap-5 xl:grid-cols-2">
      <AppCard
        ><h2 class="text-lg font-bold text-main">Configurations internes</h2>
        <div class="mt-4 space-y-3">
          <div v-for="item in settings.configurations" :key="item.id" class="rounded-xl border border-custom p-4">
            <div class="flex justify-between gap-3">
              <span class="font-semibold text-main">{{ item.name }}</span
              ><span class="text-sm text-muted-custom">v{{ item.version }}</span>
            </div>
            <p class="mt-2 text-sm text-secondary-custom">Proratisation : {{ prorationLabel(item.prorationMethod) }}</p>
            <p class="text-sm text-muted-custom">Arrondi : au centime, {{ item.roundingMode }}</p>
          </div>
          <p v-if="!settings.configurations.length" class="py-8 text-center text-muted-custom">
            Aucune configuration interne active.
          </p>
        </div></AppCard
      ><AppCard
        ><h2 class="text-lg font-bold text-main">Règles légales</h2>
        <div class="mt-4 space-y-3">
          <div v-for="rule in settings.ruleSets" :key="rule.id" class="rounded-xl border border-custom p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-main">{{ rule.name }}</p>
                <p class="text-sm text-muted-custom">Source : {{ rule.officialSourceName || 'Non renseignée' }}</p>
              </div>
              <AppStatusBadge :status="rule.verificationStatus" :label="statusLabel(rule.verificationStatus)" />
            </div>
            <p v-if="rule.isActive" class="mt-2 text-sm font-semibold text-brand">Configuration active</p>
          </div>
          <p v-if="!settings.ruleSets.length" class="py-8 text-center text-muted-custom">
            Aucune règle. Les exemples juridiques ne sont jamais activés automatiquement.
          </p>
        </div></AppCard
      >
    </div>
    <nav class="flex flex-wrap gap-2">
      <NuxtLink to="/rh/paie/composants" class="btn-secondary">Composants salariaux</NuxtLink
      ><NuxtLink to="/rh/paie/avances-prets" class="btn-secondary">Avances et prêts</NuxtLink>
    </nav>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { statusLabel } = useHrPayroll()
const settings = await $fetch<any>('/api/rh/paie/parametres')
const prorationLabel = (v: string) =>
  ({
    CALENDAR_DAYS: 'Jours calendaires',
    WORKING_DAYS: 'Jours ouvrés',
    SCHEDULED_MINUTES: 'Minutes planifiées',
    VALIDATED_MINUTES: 'Minutes validées'
  })[v] || 'Méthode configurée'
</script>
