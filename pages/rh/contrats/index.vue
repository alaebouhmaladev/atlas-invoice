<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-100 tracking-tight">Contrats de travail</h1>
        <p class="text-xs text-slate-400 mt-1">Gérez le cycle de vie des contrats des employés.</p>
      </div>

      <button
        @click="openCreateModal"
        class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2 self-start sm:self-auto"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nouveau contrat</span>
      </button>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Search Input -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Recherche</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="N° contrat, employé..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pl-9 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <svg class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Statut</label>
          <select
            v-model="statusFilter"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">Tous les statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="ACTIVE">Actif</option>
            <option value="RENEWED">Renouvelé</option>
            <option value="TERMINATED">Résilié</option>
            <option value="EXPIRED">Expiré</option>
            <option value="CANCELLED">Annulé</option>
          </select>
        </div>

        <!-- Contract Type Filter -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Type de contrat</label>
          <select
            v-model="typeFilter"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">Tous les types</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="TEMPORARY">Contrat temporaire</option>
            <option value="INTERNSHIP">Stage</option>
            <option value="PART_TIME">Temps partiel</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>

        <!-- Expiration Filter -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Expiration sous</label>
          <select
            v-model="expiringFilter"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">Toutes les dates</option>
            <option value="30">30 jours</option>
            <option value="60">60 jours</option>
            <option value="90">90 jours</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Contracts Table -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>

      <div v-else-if="contracts.length === 0" class="text-center py-16 space-y-3">
        <div class="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-xs font-semibold text-slate-400">Aucun contrat trouvé</p>
        <p class="text-[11px] text-slate-500 max-w-sm mx-auto">Modifiez les filtres de recherche ou créez un nouveau contrat de travail.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th class="py-3.5 px-4">N° Contrat</th>
              <th class="py-3.5 px-4">Employé</th>
              <th class="py-3.5 px-4">Type</th>
              <th class="py-3.5 px-4">Site</th>
              <th class="py-3.5 px-4">Début</th>
              <th class="py-3.5 px-4">Fin</th>
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-xs">
            <tr v-for="c in contracts" :key="c.id" class="hover:bg-slate-800/30 transition-colors">
              <!-- N° Contrat -->
              <td class="py-3 px-4 font-mono font-semibold text-amber-400">
                {{ c.contractNumber }}
              </td>

              <!-- Employé -->
              <td class="py-3 px-4">
                <NuxtLink :to="`/rh/employes/${c.employeeId}`" class="font-bold text-slate-200 hover:text-amber-400 block">
                  {{ c.employeeNameSnapshot || c.employee?.displayName || '-' }}
                </NuxtLink>
                <span class="text-[10px] font-mono text-slate-500 block">{{ c.employeeNumberSnapshot || c.employee?.employeeNumber }}</span>
              </td>

              <!-- Type -->
              <td class="py-3 px-4 text-slate-300">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {{ formatContractType(c.contractType) }}
                </span>
              </td>

              <!-- Site -->
              <td class="py-3 px-4 text-slate-300">
                {{ c.siteSnapshot || c.site?.name || '—' }}
              </td>

              <!-- Début -->
              <td class="py-3 px-4 text-slate-300">
                {{ formatHrDate(c.startDate) }}
              </td>

              <!-- Fin -->
              <td class="py-3 px-4 text-slate-300">
                {{ c.endDate ? formatHrDate(c.endDate) : 'Indéterminée' }}
              </td>

              <!-- Statut -->
              <td class="py-3 px-4">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block" :class="getContractStatusBadgeClass(c.status)">
                  {{ formatContractStatus(c.status) }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="c.status === 'DRAFT'"
                    @click="activateContract(c)"
                    class="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg font-bold text-[11px] transition-colors"
                  >
                    Activer
                  </button>

                  <button
                    v-if="c.status === 'ACTIVE'"
                    @click="openRenewModal(c)"
                    class="px-2.5 py-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg font-bold text-[11px] transition-colors"
                  >
                    Renouveler
                  </button>

                  <button
                    v-if="c.status === 'ACTIVE'"
                    @click="openTerminateModal(c)"
                    class="px-2.5 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg font-bold text-[11px] transition-colors"
                  >
                    Résilier
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatContractStatus, getContractStatusBadgeClass, formatContractType, formatHrDate } from '~/utils/hrFormatters'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const searchQuery = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const expiringFilter = ref('')
const loading = ref(false)
const contracts = ref<any[]>([])

const notify = useNotify()

watch([searchQuery, statusFilter, typeFilter, expiringFilter], () => {
  loadContracts()
}, { immediate: true })

async function loadContracts() {
  loading.value = true
  try {
    const params: any = {
      search: searchQuery.value,
      status: statusFilter.value || undefined,
      contractType: typeFilter.value || undefined,
      expiringInDays: expiringFilter.value || undefined
    }
    const res = await $fetch<any>('/api/rh/contrats', { params })
    contracts.value = res.data || []
  } catch (err: any) {
    notify.notifyError(err.data?.message || 'Erreur lors du chargement des contrats.')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  notify.info('Information', 'Nouveau contrat brouillon bientôt disponible dans l’interface.')
}

async function activateContract(contract: any) {
  try {
    await $fetch(`/api/rh/contrats/${contract.id}/activate`, {
      method: 'POST',
      body: { version: contract.version }
    })
    notify.notifySuccess(`Contrat ${contract.contractNumber} activé avec succès.`)
    loadContracts()
  } catch (err: any) {
    notify.notifyError(err.data?.message || 'Erreur lors de l’activation du contrat.')
  }
}

function openRenewModal(contract: any) {
  notify.info('Information', `Renouvellement du contrat ${contract.contractNumber} bientôt disponible.`)
}

function openTerminateModal(contract: any) {
  notify.info('Information', `Résiliation du contrat ${contract.contractNumber} bientôt disponible.`)
}
</script>
