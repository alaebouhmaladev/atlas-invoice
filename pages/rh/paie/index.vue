<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-semibold text-brand">Ressources humaines</p>
        <h1 class="text-2xl font-bold text-main">Paie</h1>
        <p class="mt-1 text-sm text-secondary-custom">Préparation, contrôle et clôture mensuelle sécurisée.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/rh/paie/variables" class="btn-secondary">Variables</NuxtLink>
        <NuxtLink to="/rh/paie/parametres" class="btn-secondary">Paramètres</NuxtLink>
        <NuxtLink to="/rh/paie/periodes" class="btn-primary">Périodes de paie</NuxtLink>
      </div>
    </header>
    <div v-if="error" role="alert" class="rounded-xl border border-danger bg-danger-soft p-4 text-sm text-danger">
      {{ error }}
    </div>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AppCard
        ><p class="text-sm text-muted-custom">Période actuelle</p>
        <p class="mt-2 text-lg font-bold text-main">{{ current?.name || 'À créer' }}</p></AppCard
      >
      <AppCard
        ><p class="text-sm text-muted-custom">Statut</p>
        <p class="mt-2 text-lg font-bold text-main">
          {{ current ? statusLabel(current.status) : 'Non préparée' }}
        </p></AppCard
      >
      <AppCard
        ><p class="text-sm text-muted-custom">Salariés calculés</p>
        <p class="mt-2 text-2xl font-bold text-main">{{ current?._count.records || 0 }}</p></AppCard
      >
      <AppCard
        ><p class="text-sm text-muted-custom">Variables</p>
        <p class="mt-2 text-2xl font-bold text-main">{{ current?._count.variables || 0 }}</p></AppCard
      >
    </div>
    <AppCard>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-main">Dernières périodes</h2>
          <p class="text-sm text-muted-custom">Les montants restent réservés aux rôles autorisés.</p>
        </div>
        <span v-if="loading" class="text-sm text-muted-custom">Chargement…</span>
      </div>
      <div v-if="!loading && !periods.length" class="py-10 text-center text-sm text-muted-custom">
        Aucune période de paie. Configurez les règles avant le premier calcul.
      </div>
      <div v-else class="mt-4 grid gap-3">
        <NuxtLink
          v-for="period in periods.slice(0, 6)"
          :key="period.id"
          :to="`/rh/paie/periodes/${period.id}`"
          class="rounded-xl border border-custom bg-surface p-4 transition hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="font-semibold text-main">{{ period.name }}</p>
              <p class="text-sm text-muted-custom">
                Paiement le {{ new Date(period.paymentDate).toLocaleDateString('fr-MA') }}
              </p>
            </div>
            <AppStatusBadge :status="period.status" :label="statusLabel(period.status)" />
          </div>
        </NuxtLink>
      </div>
    </AppCard>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { periods, loading, error, loadPeriods, statusLabel } = useHrPayroll()
const current = computed(() => periods.value[0])
await loadPeriods()
</script>
