<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-semibold text-brand">Paie</p>
      <h1 class="text-2xl font-bold text-main">Avances et prêts</h1>
      <p class="mt-1 text-sm text-secondary-custom">
        Suivi des soldes et échéanciers sans dépasser le capital restant.
      </p>
    </header>
    <div class="grid gap-5 xl:grid-cols-2">
      <AppCard
        ><h2 class="text-lg font-bold text-main">Avances</h2>
        <div class="mt-4 space-y-3">
          <div v-for="item in advances" :key="item.id" class="rounded-xl border border-custom p-4">
            <div class="flex justify-between gap-3">
              <span class="font-semibold text-main">{{ item.reference }}</span
              ><AppStatusBadge :status="item.status" :label="debtLabel(item.status)" />
            </div>
            <p class="mt-2 text-sm text-muted-custom">Reste à retenir : {{ formatMoney(item.remainingAmount) }}</p>
          </div>
          <p v-if="!advances.length" class="py-8 text-center text-muted-custom">Aucune avance.</p>
        </div></AppCard
      ><AppCard
        ><h2 class="text-lg font-bold text-main">Prêts</h2>
        <div class="mt-4 space-y-3">
          <div v-for="item in loans" :key="item.id" class="rounded-xl border border-custom p-4">
            <div class="flex justify-between gap-3">
              <span class="font-semibold text-main">{{ item.reference }}</span
              ><AppStatusBadge :status="item.status" :label="debtLabel(item.status)" />
            </div>
            <p class="mt-2 text-sm text-muted-custom">
              Reste : {{ formatMoney(item.remainingAmount) }} · {{ item.installments.length }} échéance(s)
            </p>
          </div>
          <p v-if="!loans.length" class="py-8 text-center text-muted-custom">Aucun prêt.</p>
        </div></AppCard
      >
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { formatMoney } = useHrPayroll()
const [advances, loans] = await Promise.all([
  $fetch<any[]>('/api/rh/paie/avances'),
  $fetch<any[]>('/api/rh/paie/prets')
])
const debtLabel = (s: string) =>
  ({
    DRAFT: 'Brouillon',
    APPROVED: 'Approuvé',
    ACTIVE: 'En cours',
    SUSPENDED: 'Suspendu',
    SETTLED: 'Soldé',
    CANCELLED: 'Annulé'
  })[s] || 'Statut inconnu'
</script>
