<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-semibold text-brand">Paie</p>
      <h1 class="text-2xl font-bold text-main">Bulletins de paie</h1>
      <p class="mt-1 text-sm text-secondary-custom">Consultation privée des bulletins validés et clôturés.</p>
    </header>
    <AppCard v-if="record"
      ><div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-lg font-bold text-main">{{ record.employeeNameSnapshot }}</h2>
          <p class="text-sm text-muted-custom">{{ record.employeeNumberSnapshot }} · {{ record.period.name }}</p>
        </div>
        <a :href="`/api/rh/paie/employes/${record.id}/payslip`" class="btn-primary">Télécharger le PDF</a>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p class="text-sm text-muted-custom">Brut</p>
          <p class="font-bold text-main">{{ formatMoney(record.grossSalary) }}</p>
        </div>
        <div>
          <p class="text-sm text-muted-custom">Retenues</p>
          <p class="font-bold text-main">{{ formatMoney(record.totalDeductions) }}</p>
        </div>
        <div>
          <p class="text-sm text-muted-custom">Net à payer</p>
          <p class="font-bold text-main">{{ formatMoney(record.netPayable) }}</p>
        </div>
        <div>
          <p class="text-sm text-muted-custom">Coût employeur</p>
          <p class="font-bold text-main">{{ formatMoney(record.employerCost) }}</p>
        </div>
      </div>
      <div class="mt-6 divide-y divide-custom">
        <div v-for="line in record.lines" :key="line.id" class="flex justify-between gap-4 py-3 text-sm">
          <span class="text-secondary-custom">{{ line.componentNameSnapshot }}</span
          ><span class="font-medium text-main">{{ formatMoney(line.employeeAmount) }}</span>
        </div>
      </div></AppCard
    ><AppCard v-else
      ><p class="py-8 text-center text-muted-custom">
        Sélectionnez un bulletin depuis le détail d’une période.
      </p></AppCard
    >
  </div>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const { formatMoney } = useHrPayroll()
const record = ref<any>(null)
if (route.query.record) record.value = await $fetch(`/api/rh/paie/employes/${route.query.record}`)
</script>
