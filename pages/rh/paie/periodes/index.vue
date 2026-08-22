<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-semibold text-brand">Paie</p>
      <h1 class="text-2xl font-bold text-main">Périodes de paie</h1>
      <p class="mt-1 text-sm text-secondary-custom">Une seule période canonique par mois et par organisation.</p>
    </header>
    <AppCard>
      <form class="grid gap-3 md:grid-cols-4" @submit.prevent="createPeriod">
        <label class="text-sm text-secondary-custom"
          >Année<input v-model.number="form.year" type="number" min="2020" max="2100" required class="input-field mt-1"
        /></label>
        <label class="text-sm text-secondary-custom"
          >Mois<select v-model.number="form.month" required class="input-field mt-1">
            <option v-for="month in 12" :key="month" :value="month">{{ month }}</option>
          </select></label
        >
        <label class="text-sm text-secondary-custom"
          >Date de paiement<input v-model="form.paymentDate" type="date" required class="input-field mt-1"
        /></label>
        <div class="flex items-end">
          <AppButton type="submit" :disabled="submitting">{{
            submitting ? 'Création…' : 'Créer la période'
          }}</AppButton>
        </div>
      </form>
      <p class="mt-3 text-xs text-muted-custom">
        La période restera bloquée tant qu’aucune configuration légale active et vérifiée ne lui est associée.
      </p>
    </AppCard>
    <div v-if="error" role="alert" class="rounded-xl border border-danger bg-danger-soft p-4 text-sm text-danger">
      {{ error }}
    </div>
    <div class="grid gap-3">
      <NuxtLink
        v-for="period in periods"
        :key="period.id"
        :to="`/rh/paie/periodes/${period.id}`"
        class="rounded-xl border border-custom bg-surface p-4 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="font-semibold text-main">{{ period.name }}</p>
            <p class="text-sm text-muted-custom">{{ period.periodNumber }} · {{ period._count.records }} bulletin(s)</p>
          </div>
          <AppStatusBadge :status="period.status" :label="statusLabel(period.status)" />
        </div>
      </NuxtLink>
      <p v-if="!loading && !periods.length" class="py-10 text-center text-muted-custom">Aucune période disponible.</p>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const { periods, loading, error, loadPeriods, statusLabel } = useHrPayroll()
const now = new Date()
const submitting = ref(false)
const form = reactive({
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  paymentDate: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().slice(0, 10)
})
async function createPeriod() {
  submitting.value = true
  try {
    const created = await $fetch<{ id: string }>('/api/rh/paie/periodes', { method: 'POST', body: form })
    await navigateTo(`/rh/paie/periodes/${created.id}`)
  } finally {
    submitting.value = false
  }
}
await loadPeriods()
</script>
