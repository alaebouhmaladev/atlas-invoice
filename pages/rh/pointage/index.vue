<template>
  <div class="space-y-6">
    <!-- Header Controls & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-main tracking-tight">Tableau de Bord Pointage</h1>
        <p class="text-xs text-secondary-custom mt-1">Suivi en temps réel des présences, pauses et anomalies de pointage.</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink
          to="/rh/pointage/badgeuse"
          class="px-4 py-2.5 bg-brand text-on-brand hover:bg-brand-strong font-bold rounded-pill text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Espace Badgeuse Web
        </NuxtLink>

        <NuxtLink
          to="/rh/pointage/terminal"
          class="px-4 py-2.5 bg-panel-raised hover:bg-surface-hover text-main font-semibold rounded-control text-xs transition-colors flex items-center gap-2 border border-custom cursor-pointer"
        >
          <svg class="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Mode Terminal Tablette
        </NuxtLink>

        <button
          @click="fetchDashboardData"
          class="p-2.5 bg-panel-raised hover:bg-surface-hover text-main rounded-control transition-colors border border-custom cursor-pointer"
          title="Rafraîchir"
        >
          <svg class="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Summary KPI Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <div class="bg-panel border border-custom rounded-card p-4 space-y-1 shadow-soft">
        <div class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">Présents</div>
        <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{{ data?.presentCount || 0 }}</div>
        <div class="text-[11px] text-secondary-custom">Actuellement au travail</div>
      </div>

      <div class="bg-panel border border-custom rounded-card p-4 space-y-1 shadow-soft">
        <div class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">En Pause</div>
        <div class="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1">{{ data?.breakCount || 0 }}</div>
        <div class="text-[11px] text-secondary-custom">Pause active</div>
      </div>

      <div class="bg-panel border border-custom rounded-card p-4 space-y-1 shadow-soft">
        <div class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">Retards</div>
        <div class="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">{{ data?.lateCount || 0 }}</div>
        <div class="text-[11px] text-secondary-custom">Pointages en retard</div>
      </div>

      <div class="bg-panel border border-custom rounded-card p-4 space-y-1 shadow-soft">
        <div class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">Planifiés</div>
        <div class="text-2xl font-black text-main font-mono mt-1">{{ data?.plannedCount || 0 }}</div>
        <div class="text-[11px] text-secondary-custom">Collaborateurs prévus</div>
      </div>

      <div class="bg-panel border border-custom rounded-card p-4 space-y-1 shadow-soft">
        <div class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">Pointés Effectivement</div>
        <div class="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono mt-1">{{ data?.actualCount || 0 }}</div>
        <div class="text-[11px] text-secondary-custom">Au moins 1 pointage</div>
      </div>

      <div class="bg-panel border border-custom rounded-card p-4 space-y-1 shadow-soft">
        <div class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">Anomalies Critiques</div>
        <div class="text-2xl font-black text-rose-600 dark:text-rose-500 font-mono mt-1">{{ data?.criticalAnomaliesCount || 0 }}</div>
        <div class="text-[11px] text-secondary-custom">À traiter en priorité</div>
      </div>
    </div>

    <!-- Active Attendance Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Present Employees -->
      <div class="bg-panel border border-custom rounded-card p-5 space-y-4 shadow-soft">
        <h2 class="text-sm font-bold text-main flex items-center justify-between">
          <span>Collaborateurs Présents ({{ data?.presentEmployees?.length || 0 }})</span>
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </h2>

        <div v-if="!data?.presentEmployees?.length" class="text-center py-8 text-xs text-muted-custom font-semibold">
          Aucun collaborateur actuellement au travail.
        </div>

        <div v-else class="space-y-2 max-h-96 overflow-y-auto pr-1">
          <div
            v-for="item in data.presentEmployees"
            :key="item.employee.id"
            class="p-3 bg-panel-raised border border-custom rounded-control flex items-center justify-between"
          >
            <div>
              <div class="text-xs font-bold text-main">{{ item.employee.displayName }}</div>
              <div class="text-[11px] text-brand-strong font-mono">Matricule : {{ item.employee.employeeNumber }}</div>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold rounded-pill border border-emerald-500/20">
                Pointé à {{ item.lastEvent.localTime }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Employees on Break -->
      <div class="bg-panel border border-custom rounded-card p-5 space-y-4 shadow-soft">
        <h2 class="text-sm font-bold text-main flex items-center justify-between">
          <span>Collaborateurs en Pause ({{ data?.breakEmployees?.length || 0 }})</span>
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
        </h2>

        <div v-if="!data?.breakEmployees?.length" class="text-center py-8 text-xs text-muted-custom font-semibold">
          Aucun collaborateur en pause actuellement.
        </div>

        <div v-else class="space-y-2 max-h-96 overflow-y-auto pr-1">
          <div
            v-for="item in data.breakEmployees"
            :key="item.employee.id"
            class="p-3 bg-panel-raised border border-custom rounded-control flex items-center justify-between"
          >
            <div>
              <div class="text-xs font-bold text-main">{{ item.employee.displayName }}</div>
              <div class="text-[11px] text-brand-strong font-mono">Matricule : {{ item.employee.employeeNumber }}</div>
            </div>
            <div class="text-right">
              <span class="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold rounded-pill border border-amber-500/20">
                Début pause : {{ item.lastEvent.localTime }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const data = ref<any>(null)
const loading = ref(true)

async function fetchDashboardData() {
  loading.value = true
  try {
    data.value = await $fetch('/api/rh/pointage/aujourdhui')
  } catch (err) {
    console.error('Failed to load dashboard attendance:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>
