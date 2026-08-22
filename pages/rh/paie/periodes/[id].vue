<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <NuxtLink to="/rh/paie/periodes" class="text-sm font-semibold text-brand">← Périodes</NuxtLink>
        <h1 class="mt-2 text-2xl font-bold text-main">{{ period?.name || 'Période de paie' }}</h1>
        <p class="text-sm text-muted-custom">{{ period?.periodNumber }}</p>
      </div>
      <AppStatusBadge v-if="period" :status="period.status" :label="statusLabel(period.status)" />
    </header>
    <div v-if="loadError" role="alert" class="rounded-xl border border-danger bg-danger-soft p-4 text-sm text-danger">
      {{ loadError }}
    </div>
    <div v-if="period" class="space-y-5">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AppCard
          ><p class="text-sm text-muted-custom">Brut total</p>
          <p class="mt-2 text-xl font-bold text-main">{{ formatMoney(totals.gross) }}</p></AppCard
        >
        <AppCard
          ><p class="text-sm text-muted-custom">Retenues</p>
          <p class="mt-2 text-xl font-bold text-main">{{ formatMoney(totals.deductions) }}</p></AppCard
        >
        <AppCard
          ><p class="text-sm text-muted-custom">Net à payer</p>
          <p class="mt-2 text-xl font-bold text-main">{{ formatMoney(totals.net) }}</p></AppCard
        >
        <AppCard
          ><p class="text-sm text-muted-custom">Coût employeur</p>
          <p class="mt-2 text-xl font-bold text-main">{{ formatMoney(totals.cost) }}</p></AppCard
        >
      </div>
      <AppCard>
        <div class="flex flex-wrap gap-2">
          <AppButton :disabled="busy" variant="secondary" @click="prepare">Vérifier la préparation</AppButton
          ><AppButton
            :disabled="busy || !['DRAFT', 'REOPENED', 'CALCULATED'].includes(period.status)"
            @click="calculate"
            >Calculer</AppButton
          ><AppButton
            :disabled="busy || period.status !== 'CALCULATED'"
            variant="secondary"
            @click="openConfirmation('VALIDER LA PAIE')"
            >Valider</AppButton
          ><AppButton
            :disabled="busy || period.status !== 'VALIDATED'"
            variant="destructive"
            @click="openConfirmation('CLÔTURER LA PAIE')"
            >Clôturer</AppButton
          ><AppButton
            v-if="period.status === 'CLOSED'"
            :disabled="busy"
            variant="destructive"
            @click="openConfirmation('RÉOUVRIR LA PAIE')"
            >Rouvrir</AppButton
          >
        </div>
        <div v-if="readiness" class="mt-4 grid gap-2">
          <p class="font-semibold text-main">{{ readiness.ready ? 'Prête pour le calcul' : 'Blocages détectés' }}</p>
          <p
            v-for="item in readiness.blockers"
            :key="item.code + item.employeeId"
            class="rounded-lg bg-danger-soft p-3 text-sm text-danger"
          >
            {{ item.message }}
          </p>
          <p
            v-for="item in readiness.warnings"
            :key="item.code + item.employeeId"
            class="rounded-lg bg-warning-soft p-3 text-sm text-warning"
          >
            {{ item.message }}
          </p>
        </div>
      </AppCard>
      <AppCard
        ><h2 class="text-lg font-bold text-main">Bulletins calculés</h2>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-[760px] w-full text-sm">
            <thead>
              <tr class="border-b border-custom text-left text-muted-custom">
                <th class="p-3">Employé</th>
                <th class="p-3">Brut</th>
                <th class="p-3">Retenues</th>
                <th class="p-3">Net</th>
                <th class="p-3">Coût employeur</th>
                <th class="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in period.records" :key="record.id" class="border-b border-custom">
                <td class="p-3 font-medium text-main">
                  {{ record.employeeNameSnapshot
                  }}<span class="block text-xs text-muted-custom">{{ record.employeeNumberSnapshot }}</span>
                </td>
                <td class="p-3 text-main">{{ formatMoney(record.grossSalary) }}</td>
                <td class="p-3 text-main">{{ formatMoney(record.totalDeductions) }}</td>
                <td class="p-3 font-semibold text-main">{{ formatMoney(record.netPayable) }}</td>
                <td class="p-3 text-main">{{ formatMoney(record.employerCost) }}</td>
                <td class="p-3">
                  <NuxtLink :to="`/rh/paie/bulletins?record=${record.id}`" class="text-brand hover:underline"
                    >Détail</NuxtLink
                  >
                </td>
              </tr>
              <tr v-if="!period.records.length">
                <td colspan="6" class="p-8 text-center text-muted-custom">Aucun calcul disponible.</td>
              </tr>
            </tbody>
          </table>
        </div></AppCard
      >
    </div>
    <AppModal v-model="showConfirm" title="Confirmation de paie"
      ><div class="space-y-4">
        <p class="text-sm text-secondary-custom">
          Saisissez exactement <strong>{{ expectedConfirmation }}</strong
          >.
        </p>
        <input v-model="typedConfirmation" class="input-field" autocomplete="off" /><textarea
          v-if="expectedConfirmation === 'RÉOUVRIR LA PAIE'"
          v-model="reason"
          class="input-field min-h-28"
          placeholder="Motif détaillé obligatoire"
        ></textarea>
        <div class="flex justify-end gap-2">
          <AppButton variant="secondary" @click="showConfirm = false">Annuler</AppButton
          ><AppButton
            variant="destructive"
            :disabled="typedConfirmation !== expectedConfirmation || busy"
            @click="confirmAction"
            >Confirmer</AppButton
          >
        </div>
      </div></AppModal
    >
  </div>
</template>
<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const { formatMoney, statusLabel } = useHrPayroll()
const busy = ref(false)
const loadError = ref<string | null>(null)
const readiness = ref<any>(null)
const showConfirm = ref(false)
const expectedConfirmation = ref('')
const typedConfirmation = ref('')
const reason = ref('')
const { data: period, refresh } = await useFetch<any>(`/api/rh/paie/periodes/${route.params.id}`, {
  onResponseError({ response }) {
    loadError.value = response._data?.message || 'Impossible de charger la période.'
  }
})
const totals = computed(() =>
  (period.value?.records || []).reduce(
    (sum: any, item: any) => ({
      gross: sum.gross + Number(item.grossSalary),
      deductions: sum.deductions + Number(item.totalDeductions),
      net: sum.net + Number(item.netPayable),
      cost: sum.cost + Number(item.employerCost)
    }),
    { gross: 0, deductions: 0, net: 0, cost: 0 }
  )
)
async function prepare() {
  busy.value = true
  try {
    readiness.value = await $fetch(`/api/rh/paie/periodes/${route.params.id}/prepare`, { method: 'POST' })
  } finally {
    busy.value = false
  }
}
async function calculate() {
  busy.value = true
  try {
    await $fetch(`/api/rh/paie/periodes/${route.params.id}/calculate`, { method: 'POST' })
    await refresh()
  } finally {
    busy.value = false
  }
}
function openConfirmation(value: string) {
  expectedConfirmation.value = value
  typedConfirmation.value = ''
  reason.value = ''
  showConfirm.value = true
}
async function confirmAction() {
  busy.value = true
  try {
    const action =
      expectedConfirmation.value === 'VALIDER LA PAIE'
        ? 'validate'
        : expectedConfirmation.value === 'CLÔTURER LA PAIE'
          ? 'close'
          : 'reopen'
    await $fetch(`/api/rh/paie/periodes/${route.params.id}/${action}`, {
      method: 'POST',
      body: {
        confirmation: typedConfirmation.value,
        version: period.value.version,
        ...(action === 'reopen' ? { reason: reason.value } : {})
      }
    })
    showConfirm.value = false
    await refresh()
  } finally {
    busy.value = false
  }
}
</script>
