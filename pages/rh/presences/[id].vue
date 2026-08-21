<template>
  <div class="space-y-6">
    <!-- Back Header -->
    <div class="flex items-center justify-between">
      <NuxtLink to="/rh/presences" class="text-sm font-semibold text-brand hover:underline flex items-center gap-1.5">
        ← Retour aux feuilles de présence
      </NuxtLink>
    </div>

    <div v-if="loading" class="text-center py-12 text-muted-custom">Chargement de la fiche de présence...</div>
    <div v-else-if="!data" class="text-center py-12 text-muted-custom">Fiche introuvable.</div>

    <div v-else class="space-y-6">
      <!-- Main Summary Card -->
      <div class="bg-panel border border-custom rounded-3xl p-6 sm:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="text-xs font-semibold text-brand uppercase tracking-widest">FICHE DE PRÉSENCE DÉTAILLÉE</div>
            <h1 class="text-2xl font-bold text-main mt-1">{{ data.day.employee.displayName }}</h1>
            <p class="text-sm text-muted-custom">Matricule : {{ data.day.employee.employeeNumber }} | Site : {{ data.day.site.name }}</p>
          </div>

          <div class="text-right">
            <div class="text-xs text-muted-custom">Date de Travail</div>
            <div class="text-lg font-bold text-main font-mono">{{ data.day.workDate.split('T')[0] }}</div>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-custom">
          <div class="bg-panel-raised p-4 rounded-2xl border border-custom">
            <div class="text-xs text-muted-custom font-medium">Heures Prévues</div>
            <div class="text-xl font-bold text-main mt-1">{{ (data.day.plannedMinutes / 60).toFixed(1) }} h</div>
          </div>

          <div class="bg-panel-raised p-4 rounded-2xl border border-custom">
            <div class="text-xs text-muted-custom font-medium">Net Travaillé</div>
            <div class="text-xl font-bold text-brand mt-1">{{ (data.day.netWorkedMinutes / 60).toFixed(1) }} h</div>
          </div>

          <div class="bg-panel-raised p-4 rounded-2xl border border-custom">
            <div class="text-xs text-muted-custom font-medium">Durée Pauses</div>
            <div class="text-xl font-bold text-indigo-400 mt-1">{{ data.day.paidBreakMinutes + data.day.unpaidBreakMinutes }} min</div>
          </div>

          <div class="bg-panel-raised p-4 rounded-2xl border border-custom">
            <div class="text-xs text-muted-custom font-medium">Retard constaté</div>
            <div class="text-xl font-bold text-rose-400 mt-1">{{ data.day.lateMinutes }} min</div>
          </div>
        </div>
      </div>

      <!-- Timeline & Raw Events -->
      <div class="bg-panel border border-custom rounded-3xl p-6 sm:p-8 space-y-6">
        <h2 class="text-lg font-bold text-main">Chronologie & Événements Bruts de Pointage</h2>

        <div v-if="!data.rawEvents.length" class="text-sm text-muted-custom">Aucun événement brut enregistré pour cette date.</div>

        <div v-else class="space-y-3">
          <div
            v-for="ev in data.rawEvents"
            :key="ev.id"
            class="p-4 bg-panel-raised border border-custom rounded-2xl flex items-center justify-between"
          >
            <div class="flex items-center gap-4">
              <span :class="getEventTypeBadgeClass(ev.eventType)" class="px-3 py-1 text-xs font-bold rounded-xl border">
                {{ formatEventType(ev.eventType) }}
              </span>
              <div>
                <div class="text-sm font-bold text-main font-mono">{{ ev.localTime }} ({{ ev.localDate }})</div>
                <div class="text-xs text-muted-custom">Source : {{ ev.eventSource }} {{ ev.terminal ? `• Borne : ${ev.terminal.name}` : '' }}</div>
              </div>
            </div>

            <div class="text-xs text-muted-custom font-mono">
              UTC: {{ new Date(ev.timestamp).toISOString().substring(11, 19) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const data = ref<any>(null)
const loading = ref(true)

async function fetchDetail() {
  loading.value = true
  try {
    data.value = await $fetch<any>(`/api/rh/presences/${route.params.id}`)
  } catch (err) {
    console.error('Failed to fetch attendance detail:', err)
  } finally {
    loading.value = false
  }
}

function formatEventType(type: string) {
  if (type === 'CLOCK_IN') return 'Entrée'
  if (type === 'BREAK_START') return 'Début Pause'
  if (type === 'BREAK_END') return 'Fin Pause'
  if (type === 'CLOCK_OUT') return 'Sortie'
  return type
}

function getEventTypeBadgeClass(type: string) {
  if (type === 'CLOCK_IN') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (type === 'BREAK_START') return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  if (type === 'BREAK_END') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
  if (type === 'CLOCK_OUT') return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  return 'bg-panel-raised text-muted-custom border-custom'
}

onMounted(() => {
  fetchDetail()
})
</script>
