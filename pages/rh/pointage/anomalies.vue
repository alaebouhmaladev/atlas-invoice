<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-main tracking-tight">Anomalies de Pointage</h1>
        <p class="text-xs text-secondary-custom mt-1">Détection automatique, suivi et résolution des écarts de pointage.</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="isResolvedFilter = undefined"
          :class="isResolvedFilter === undefined ? 'bg-brand text-on-brand hover:bg-brand-strong font-bold' : 'bg-panel-raised hover:bg-surface-hover text-secondary-custom border border-custom'"
          class="px-3 py-1.5 rounded-pill text-xs font-semibold transition-all cursor-pointer"
        >
          Toutes
        </button>
        <button
          @click="isResolvedFilter = false"
          :class="isResolvedFilter === false ? 'bg-brand text-on-brand hover:bg-brand-strong font-bold' : 'bg-panel-raised hover:bg-surface-hover text-secondary-custom border border-custom'"
          class="px-3 py-1.5 rounded-pill text-xs font-semibold transition-all cursor-pointer"
        >
          À Traiter
        </button>
        <button
          @click="isResolvedFilter = true"
          :class="isResolvedFilter === true ? 'bg-brand text-on-brand hover:bg-brand-strong font-bold' : 'bg-panel-raised hover:bg-surface-hover text-secondary-custom border border-custom'"
          class="px-3 py-1.5 rounded-pill text-xs font-semibold transition-all cursor-pointer"
        >
          Résolues
        </button>
      </div>
    </div>

    <!-- Anomalies Table -->
    <div class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-secondary-custom border-collapse">
          <thead class="bg-panel-raised text-[11px] font-bold text-muted-custom uppercase tracking-wider border-b border-custom">
            <tr>
              <th class="px-6 py-4">Sévérité</th>
              <th class="px-6 py-4">Type</th>
              <th class="px-6 py-4">Collaborateur</th>
              <th class="px-6 py-4">Site</th>
              <th class="px-6 py-4">Message</th>
              <th class="px-6 py-4">Statut</th>
              <th class="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom">
            <tr v-if="loading">
              <td colspan="7" class="text-center py-12 text-muted-custom font-semibold">Chargement des anomalies...</td>
            </tr>
            <tr v-else-if="!anomalies.length">
              <td colspan="7" class="text-center py-12 text-muted-custom font-semibold">Aucune anomalie détectée.</td>
            </tr>
            <tr v-for="a in filteredAnomalies" :key="a.id" class="hover:bg-surface-hover transition-colors">
              <td class="px-6 py-4">
                <span :class="getSeverityBadgeClass(a.severity)" class="px-2.5 py-1 text-[10px] font-bold rounded-pill border">
                  {{ a.severity }}
                </span>
              </td>
              <td class="px-6 py-4 font-mono text-xs text-brand-strong font-bold">{{ a.anomalyType }}</td>
              <td class="px-6 py-4 font-bold text-main">{{ a.employee.displayName }}</td>
              <td class="px-6 py-4 text-secondary-custom">{{ a.site.name }}</td>
              <td class="px-6 py-4 text-secondary-custom">{{ a.message }}</td>
              <td class="px-6 py-4">
                <span :class="a.isResolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'" class="font-bold text-xs">
                  {{ a.isResolved ? 'Résolue' : 'En attente' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  v-if="!a.isResolved"
                  @click="openResolveModal(a)"
                  class="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-control text-xs border border-emerald-500/20 transition-colors cursor-pointer"
                >
                  Résoudre
                </button>
                <span v-else class="text-xs text-muted-custom">Par {{ a.resolvedBy?.name || 'Système' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Resolve Modal -->
    <div v-if="selectedAnomaly" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div class="bg-panel border border-custom rounded-panel p-6 max-w-md w-full shadow-2xl space-y-4">
        <h3 class="text-base font-bold text-main">Résolution de l'Anomalie</h3>
        <p class="text-xs text-secondary-custom leading-relaxed">{{ selectedAnomaly.message }}</p>

        <div>
          <label class="block text-[11px] font-bold text-muted-custom uppercase tracking-wider mb-1.5">Note de Résolution</label>
          <textarea
            v-model="resolutionNote"
            rows="3"
            placeholder="Justifiez la résolution de cette anomalie RH..."
            class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-main placeholder-muted-custom text-xs focus:outline-none focus:border-brand transition-colors"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button @click="selectedAnomaly = null" class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main border border-custom rounded-control text-xs font-semibold transition-colors cursor-pointer">
            Annuler
          </button>
          <button @click="submitResolve" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-control text-xs font-bold transition-colors shadow-sm cursor-pointer">
            Valider la Résolution
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { showSuccess, showError } = useNotificationToast()

const anomalies = ref<any[]>([])
const loading = ref(true)
const isResolvedFilter = ref<boolean | undefined>(false)

const selectedAnomaly = ref<any>(null)
const resolutionNote = ref('')

async function fetchAnomalies() {
  loading.value = true
  try {
    anomalies.value = await $fetch<any[]>('/api/rh/pointage/anomalies')
  } catch (err) {
    console.error('Failed to load anomalies:', err)
  } finally {
    loading.value = false
  }
}

const filteredAnomalies = computed(() => {
  if (isResolvedFilter.value === undefined) return anomalies.value
  return anomalies.value.filter(a => a.isResolved === isResolvedFilter.value)
})

function getSeverityBadgeClass(sev: string) {
  if (sev === 'CRITICAL') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  if (sev === 'WARNING') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  return 'bg-surface-muted text-secondary-custom border-custom'
}

function openResolveModal(a: any) {
  selectedAnomaly.value = a
  resolutionNote.value = ''
}

async function submitResolve() {
  if (!selectedAnomaly.value || !resolutionNote.value.trim()) {
    showError('Veuillez saisir une note de résolution.')
    return
  }

  try {
    await $fetch(`/api/rh/pointage/anomalies/${selectedAnomaly.value.id}/resolve`, {
      method: 'POST',
      body: { resolutionNote: resolutionNote.value }
    })
    showSuccess('Anomalie résolue avec succès.')
    selectedAnomaly.value = null
    fetchAnomalies()
  } catch (err: any) {
    showError(err.data?.message || err.message || 'Erreur lors de la résolution.')
  }
}

onMounted(() => {
  fetchAnomalies()
})
</script>
