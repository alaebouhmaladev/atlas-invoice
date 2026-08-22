<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-brand-strong">Phase 5 · Temps RH</p>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-main">Congés & validations</h1>
        <p class="mt-1 max-w-2xl text-xs text-secondary-custom">Pilotez les demandes, les décisions et leur impact opérationnel sans altérer les plannings publiés.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/rh/conges/soldes" class="rounded-control border border-custom bg-panel-raised px-4 py-2.5 text-xs font-bold text-main hover:bg-surface-hover">Consulter les soldes</NuxtLink>
        <NuxtLink to="/rh/conges/nouveau" class="rounded-pill bg-brand px-4 py-2.5 text-xs font-bold text-on-brand shadow-sm hover:bg-brand-strong">Nouvelle demande</NuxtLink>
      </div>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AppCard v-for="metric in metrics" :key="metric.label" class="p-5">
        <p class="text-xs font-bold uppercase tracking-wider text-muted-custom">{{ metric.label }}</p>
        <div class="mt-3 flex items-end justify-between">
          <strong class="font-mono text-3xl text-main">{{ metric.value }}</strong>
          <span :class="metric.tone" class="rounded-pill px-2.5 py-1 text-xs font-bold">{{ metric.caption }}</span>
        </div>
      </AppCard>
    </div>

    <AppCard class="p-4 sm:p-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap gap-2">
          <button v-for="option in statusOptions" :key="option.value" type="button" @click="selectedStatus = option.value" :class="selectedStatus === option.value ? 'bg-brand text-on-brand' : 'bg-panel-raised text-secondary-custom hover:bg-surface-hover'" class="rounded-pill border border-custom px-3 py-1.5 text-xs font-bold transition-colors">{{ option.label }}</button>
        </div>
        <div class="flex gap-2">
          <NuxtLink to="/rh/absences" class="rounded-control border border-custom px-3 py-2 text-xs font-semibold text-secondary-custom hover:bg-surface-hover">Absences détectées</NuxtLink>
          <NuxtLink to="/rh/conges/calendrier" class="rounded-control border border-custom px-3 py-2 text-xs font-semibold text-secondary-custom hover:bg-surface-hover">Calendrier férié</NuxtLink>
        </div>
      </div>
    </AppCard>

    <div v-if="error" role="alert" class="rounded-card border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
      {{ error }}
    </div>

    <AppTable :empty="!loading && filteredRequests.length === 0">
      <template #header>
        <tr>
          <th class="px-5 py-4">Collaborateur</th>
          <th class="px-5 py-4">Type</th>
          <th class="px-5 py-4">Période</th>
          <th class="px-5 py-4">Durée</th>
          <th class="px-5 py-4">Statut</th>
          <th class="px-5 py-4 text-right">Action</th>
        </tr>
      </template>
      <tr v-if="loading"><td colspan="6" class="px-5 py-12 text-center text-muted-custom">Chargement des demandes…</td></tr>
      <tr v-for="request in filteredRequests" :key="request.id" class="hover:bg-surface-hover">
        <td class="px-5 py-4"><strong class="text-main">{{ request.employee.displayName }}</strong><span class="mt-0.5 block font-mono text-xs text-muted-custom">{{ request.employee.employeeNumber }}</span></td>
        <td class="px-5 py-4"><span class="inline-flex items-center gap-2 font-semibold text-secondary-custom"><span class="h-2 w-2 rounded-pill" :style="{ backgroundColor: request.leaveType.color }" />{{ request.leaveType.name }}</span></td>
        <td class="px-5 py-4 font-mono text-secondary-custom">{{ formatDate(request.startDate) }} → {{ formatDate(request.endDate) }}</td>
        <td class="px-5 py-4 font-mono font-bold text-main">{{ formatMinutes(request.requestedMinutes) }}</td>
        <td class="px-5 py-4"><AppStatusBadge :status="request.status" /></td>
        <td class="px-5 py-4 text-right"><NuxtLink :to="`/rh/conges/${request.id}`" class="rounded-control border border-custom bg-panel-raised px-3 py-1.5 text-xs font-bold text-brand-strong hover:bg-surface-hover">Examiner</NuxtLink></td>
      </tr>
      <template #empty><p>Aucune demande ne correspond à ce filtre.</p></template>
    </AppTable>
  </div>
</template>

<script setup lang="ts">
import AppCard from '~/components/ui/AppCard.vue'
import AppStatusBadge from '~/components/ui/AppStatusBadge.vue'
import AppTable from '~/components/ui/AppTable.vue'

useHead({ title: 'Congés & validations' })
definePageMeta({ middleware: 'auth' })
const { requests, loading, error, pendingCount, approvedCount, fetchRequests } = useHrLeave()
const selectedStatus = ref('ALL')
const statusOptions = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'PENDING_APPROVAL', label: 'À valider' },
  { value: 'APPROVED', label: 'Approuvées' },
  { value: 'REJECTED', label: 'Refusées' },
  { value: 'CANCELLED', label: 'Annulées' }
]
const filteredRequests = computed(() => selectedStatus.value === 'ALL' ? requests.value : requests.value.filter(item => item.status === selectedStatus.value))
const metrics = computed(() => [
  { label: 'Demandes actives', value: requests.value.length, caption: 'Période affichée', tone: 'bg-brand-soft text-brand-strong' },
  { label: 'À valider', value: pendingCount.value, caption: 'Action requise', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { label: 'Approuvées', value: approvedCount.value, caption: 'Décisions', tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { label: 'Refusées / annulées', value: requests.value.filter(item => ['REJECTED', 'CANCELLED'].includes(item.status)).length, caption: 'Traçabilité', tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' }
])
function formatDate(value: string) { return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) }
function formatMinutes(value: number) { return value % 60 === 0 ? `${value / 60} h` : `${Math.floor(value / 60)} h ${value % 60}` }
onMounted(() => fetchRequests().catch(() => undefined))
</script>
