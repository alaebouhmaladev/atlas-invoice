<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-main tracking-tight">Corrections & Demandes de Pointage</h1>
        <p class="text-xs text-secondary-custom mt-1">Revue et approbation des demandes de correction de temps de travail.</p>
      </div>

      <button
        @click="openNewModal"
        class="px-4 py-2.5 bg-brand hover:opacity-90 text-slate-950 font-bold rounded-pill text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        Nouvelle Demande de Correction
      </button>
    </div>

    <!-- Corrections Table -->
    <div class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-secondary-custom border-collapse">
          <thead class="bg-panel-raised text-[11px] font-bold text-muted-custom uppercase tracking-wider border-b border-custom">
            <tr>
              <th class="px-6 py-4">Collaborateur</th>
              <th class="px-6 py-4">Site</th>
              <th class="px-6 py-4">Date de travail</th>
              <th class="px-6 py-4">Motif</th>
              <th class="px-6 py-4">Demandé par</th>
              <th class="px-6 py-4">Statut</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom">
            <tr v-if="loading">
              <td colspan="7" class="text-center py-12 text-muted-custom font-semibold">Chargement des corrections...</td>
            </tr>
            <tr v-else-if="!corrections.length">
              <td colspan="7" class="text-center py-12 text-muted-custom font-semibold">Aucune demande de correction enregistrée.</td>
            </tr>
            <tr v-for="c in corrections" :key="c.id" class="hover:bg-surface-hover transition-colors">
              <td class="px-6 py-4 font-bold text-main">{{ c.employee.displayName }}</td>
              <td class="px-6 py-4 text-secondary-custom">{{ c.site.name }}</td>
              <td class="px-6 py-4 font-mono text-xs text-brand-strong font-bold">{{ c.workDate.split('T')[0] }}</td>
              <td class="px-6 py-4 text-secondary-custom">{{ c.reason }}</td>
              <td class="px-6 py-4 text-muted-custom text-xs">{{ c.requestedBy.name }}</td>
              <td class="px-6 py-4">
                <span :class="getStatusBadgeClass(c.status)" class="px-2.5 py-1 text-[10px] font-bold rounded-pill border">
                  {{ c.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div v-if="c.status === 'PENDING'">
                  <div v-if="c.requestedById === user?.id" class="text-xs text-muted-custom font-medium italic">
                    Soumis par vous (auto-validation interdite)
                  </div>
                  <div v-else class="flex items-center justify-end gap-2">
                    <button
                      @click="review(c, 'APPROVED')"
                      class="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-control text-xs border border-emerald-500/20 transition-colors cursor-pointer"
                    >
                      Approuver
                    </button>
                    <button
                      @click="openRejectModal(c)"
                      class="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-control text-xs border border-rose-500/20 transition-colors cursor-pointer"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
                <span v-else class="text-xs text-muted-custom">Revu par {{ c.reviewer?.name }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="rejectTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div class="bg-panel border border-custom rounded-panel p-6 max-w-md w-full shadow-2xl space-y-4">
        <h3 class="text-base font-bold text-main">Rejet de la Demande de Correction</h3>
        <p class="text-xs text-secondary-custom leading-relaxed">Veuillez indiquer le motif obligatoire du rejet.</p>

        <div>
          <label class="block text-[11px] font-bold text-muted-custom uppercase tracking-wider mb-1.5">Motif du Rejet</label>
          <textarea
            v-model="rejectNote"
            rows="3"
            placeholder="Raison explicite du refus..."
            class="w-full px-3 py-2 bg-panel-raised border border-custom rounded-control text-main placeholder-muted-custom text-xs focus:outline-none focus:border-rose-500 transition-colors"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button @click="rejectTarget = null" class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main border border-custom rounded-control text-xs font-semibold transition-colors cursor-pointer">
            Annuler
          </button>
          <button @click="confirmReject" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-control text-xs font-bold transition-colors shadow-sm cursor-pointer">
            Confirmer le Rejet
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()
const { showSuccess, showError } = useNotificationToast()

const corrections = ref<any[]>([])
const loading = ref(true)
const rejectTarget = ref<any>(null)
const rejectNote = ref('')

async function fetchCorrections() {
  loading.value = true
  try {
    corrections.value = await $fetch<any[]>('/api/rh/pointage/corrections')
  } catch (err) {
    console.error('Failed to load corrections:', err)
  } finally {
    loading.value = false
  }
}

function getStatusBadgeClass(st: string) {
  if (st === 'APPROVED') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (st === 'REJECTED') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
}

function openNewModal() {
  // Can be implemented for submitting employee correction
}

function openRejectModal(c: any) {
  rejectTarget.value = c
  rejectNote.value = ''
}

async function review(c: any, status: 'APPROVED' | 'REJECTED', note?: string) {
  try {
    await $fetch(`/api/rh/pointage/corrections/${c.id}/review`, {
      method: 'POST',
      body: { status, reviewNote: note }
    })
    showSuccess(status === 'APPROVED' ? 'Correction approuvée !' : 'Correction rejetée.')
    fetchCorrections()
  } catch (err: any) {
    showError(err.data?.message || err.message || 'Erreur lors de la revue.')
  }
}

async function confirmReject() {
  if (!rejectNote.value.trim()) {
    showError('Le motif du rejet est obligatoire.')
    return
  }
  await review(rejectTarget.value, 'REJECTED', rejectNote.value)
  rejectTarget.value = null
}

onMounted(() => {
  fetchCorrections()
})
</script>
