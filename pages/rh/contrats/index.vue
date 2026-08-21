<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-main tracking-tight">Contrats de travail</h1>
        <p class="text-xs text-secondary-custom mt-1">Gérez le cycle de vie des contrats des employés.</p>
      </div>

      <button
        @click="openCreateModal"
        class="px-4 py-2.5 bg-brand text-on-brand hover:bg-brand-strong text-xs font-bold rounded-pill transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nouveau contrat</span>
      </button>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-panel border border-custom rounded-panel p-4 space-y-4 shadow-soft">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Search Input -->
        <div>
          <label class="block text-[11px] font-bold text-muted-custom uppercase tracking-wider mb-1">Recherche</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="N° contrat, employé..."
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 pl-9 text-xs text-main placeholder-muted-custom focus:outline-none focus:border-brand transition-colors"
            />
            <svg class="w-4 h-4 text-muted-custom absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-[11px] font-bold text-muted-custom uppercase tracking-wider mb-1">Statut</label>
          <select
            v-model="statusFilter"
            class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs text-main focus:outline-none focus:border-brand transition-colors"
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
          <label class="block text-[11px] font-bold text-muted-custom uppercase tracking-wider mb-1">Type de contrat</label>
          <select
            v-model="typeFilter"
            class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs text-main focus:outline-none focus:border-brand transition-colors"
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
          <label class="block text-[11px] font-bold text-muted-custom uppercase tracking-wider mb-1">Expiration sous</label>
          <select
            v-model="expiringFilter"
            class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs text-main focus:outline-none focus:border-brand transition-colors"
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
    <div class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>

      <div v-else-if="contracts.length === 0" class="text-center py-16 space-y-3">
        <div class="w-12 h-12 rounded-pill bg-panel-raised text-muted-custom flex items-center justify-center mx-auto border border-custom">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-xs font-bold text-main">Aucun contrat trouvé</p>
        <p class="text-[11px] text-muted-custom max-w-sm mx-auto">Modifiez les filtres de recherche ou créez un nouveau contrat de travail.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-custom bg-panel-raised text-[11px] font-bold text-muted-custom uppercase tracking-wider">
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
          <tbody class="divide-y divide-custom text-xs">
            <tr v-for="c in contracts" :key="c.id" class="hover:bg-surface-hover transition-colors">
              <!-- N° Contrat -->
              <td class="py-3 px-4 font-mono font-bold text-brand-strong">
                {{ c.contractNumber }}
              </td>

              <!-- Employé -->
              <td class="py-3 px-4">
                <NuxtLink :to="`/rh/employes/${c.employeeId}`" class="font-bold text-main hover:text-brand block">
                  {{ c.employeeNameSnapshot || c.employee?.displayName || '-' }}
                </NuxtLink>
                <span class="text-[10px] font-mono text-muted-custom block">{{ c.employeeNumberSnapshot || c.employee?.employeeNumber }}</span>
              </td>

              <!-- Type -->
              <td class="py-3 px-4 text-secondary-custom">
                <span class="px-2.5 py-0.5 rounded-pill text-[10px] font-bold bg-panel-raised text-secondary-custom border border-custom">
                  {{ formatContractType(c.contractType) }}
                </span>
              </td>

              <!-- Site -->
              <td class="py-3 px-4 text-secondary-custom">
                {{ c.siteSnapshot || c.site?.name || '—' }}
              </td>

              <!-- Début -->
              <td class="py-3 px-4 text-secondary-custom font-mono">
                {{ formatHrDate(c.startDate) }}
              </td>

              <!-- Fin -->
              <td class="py-3 px-4 text-secondary-custom font-mono">
                {{ c.endDate ? formatHrDate(c.endDate) : 'Indéterminée' }}
              </td>

              <!-- Statut -->
              <td class="py-3 px-4">
                <span class="px-2.5 py-0.5 rounded-pill text-[10px] font-bold inline-block" :class="getContractStatusBadgeClass(c.status)">
                  {{ formatContractStatus(c.status) }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="c.status === 'DRAFT'"
                    @click="activateContract(c)"
                    class="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-control font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Activer
                  </button>

                  <button
                    v-if="c.status === 'ACTIVE'"
                    @click="openRenewModal(c)"
                    class="px-2.5 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 rounded-control font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Renouveler
                  </button>

                  <button
                    v-if="c.status === 'ACTIVE'"
                    @click="openTerminateModal(c)"
                    class="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-control font-bold text-[11px] transition-colors cursor-pointer"
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
