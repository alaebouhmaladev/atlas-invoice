<template>
  <div class="space-y-6">
    <!-- Header & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-main tracking-tight">Feuilles de Présence & Temps Travaillé</h1>
        <p class="text-xs text-secondary-custom mt-1">Consultez, validez et verrouillez les relevés de pointage des collaborateurs.</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <a
          :href="`/api/rh/pointage/exports?format=csv`"
          target="_blank"
          class="px-3.5 py-2.5 bg-panel-raised hover:bg-surface-hover text-main font-semibold rounded-control text-xs transition-colors flex items-center gap-2 border border-custom cursor-pointer"
        >
          <svg class="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter CSV
        </a>

        <a
          :href="`/api/rh/pointage/exports?format=pdf`"
          target="_blank"
          class="px-3.5 py-2.5 bg-brand text-on-brand hover:bg-brand-strong font-bold rounded-pill text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Télécharger PDF Conforme
        </a>
      </div>
    </div>

    <!-- Attendance Day Table -->
    <div class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-secondary-custom border-collapse">
          <thead class="bg-panel-raised text-[11px] font-bold text-muted-custom uppercase tracking-wider border-b border-custom">
            <tr>
              <th class="px-6 py-4">Collaborateur</th>
              <th class="px-6 py-4">Site</th>
              <th class="px-6 py-4">Date</th>
              <th class="px-6 py-4">Heures Prévues</th>
              <th class="px-6 py-4">Temps Effectif</th>
              <th class="px-6 py-4">Retard / Majorations</th>
              <th class="px-6 py-4">Statut Journée</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom">
            <tr v-if="loading">
              <td colspan="8" class="text-center py-12 text-muted-custom font-semibold">Chargement des présences...</td>
            </tr>
            <tr v-else-if="!days?.length">
              <td colspan="8" class="text-center py-12 text-muted-custom font-semibold">Aucune donnée de présence enregistrée.</td>
            </tr>
            <tr v-for="d in days" :key="d.id" class="hover:bg-surface-hover transition-colors">
              <td class="px-6 py-4 font-bold text-main">
                {{ d.employee.displayName }}
                <div class="text-[11px] font-mono text-brand-strong font-normal">Matricule : {{ d.employee.employeeNumber }}</div>
              </td>
              <td class="px-6 py-4 text-secondary-custom">{{ d.site.name }}</td>
              <td class="px-6 py-4 text-secondary-custom font-mono text-xs">{{ d.workDate.split('T')[0] }}</td>
              <td class="px-6 py-4 text-secondary-custom font-mono">{{ (d.plannedMinutes / 60).toFixed(1) }} h</td>
              <td class="px-6 py-4 font-bold text-brand-strong font-mono">{{ (d.netWorkedMinutes / 60).toFixed(1) }} h</td>
              <td class="px-6 py-4 text-xs space-y-0.5">
                <div v-if="d.lateMinutes > 0" class="text-rose-600 dark:text-rose-400 font-bold font-mono">Retard : {{ d.lateMinutes }} min</div>
                <div v-if="d.overtimeMinutes > 0" class="text-sky-600 dark:text-sky-400 font-bold font-mono">H.Suppl : {{ d.overtimeMinutes }} min</div>
                <div v-if="d.lateMinutes === 0 && d.overtimeMinutes === 0" class="text-muted-custom">—</div>
              </td>
              <td class="px-6 py-4">
                <span :class="getStatusBadgeClass(d.status)" class="px-2.5 py-1 text-[10px] font-bold rounded-pill border">
                  {{ d.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <NuxtLink
                  :to="`/rh/presences/${d.id}`"
                  class="px-3 py-1.5 bg-panel-raised hover:bg-surface-hover text-brand-strong font-bold rounded-control text-xs transition-colors border border-custom inline-block"
                >
                  Détail & Timeline
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const days = ref<any[]>([])
const loading = ref(true)

async function fetchDays() {
  loading.value = true
  try {
    days.value = await $fetch<any[]>('/api/rh/presences')
  } catch (err) {
    console.error('Failed to load presences:', err)
  } finally {
    loading.value = false
  }
}

function getStatusBadgeClass(status: string) {
  if (status === 'COMPLETE') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (status === 'OPEN') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  if (status === 'INCOMPLETE') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  if (status === 'ABSENT') return 'bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20'
  return 'bg-surface-muted text-secondary-custom border-custom'
}

onMounted(() => {
  fetchDays()
})
</script>
