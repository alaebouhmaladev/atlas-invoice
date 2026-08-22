<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-extrabold text-main tracking-tight">Annuaire des employés</h1>
        <p class="text-xs text-muted-custom mt-1">Liste complète des collaborateurs et suivi du statut administratif</p>
      </div>

      <NuxtLink
        to="/rh/employes/nouveau"
        class="px-4 py-2 bg-brand text-on-brand hover:bg-brand-strong font-bold rounded-pill text-xs transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nouveau collaborateur</span>
      </NuxtLink>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-panel border border-custom rounded-panel p-4 space-y-4 shadow-soft">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Search Input -->
        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Recherche</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Matricule, nom, email, tél..."
              @keyup.enter="handleSearch"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 pl-9 text-xs text-main focus:outline-none focus:border-brand transition-colors"
            />
            <svg class="w-4 h-4 text-muted-custom absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Status Filter -->
        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Statut</label>
          <select
            v-model="selectedStatus"
            @change="handleSearch"
            class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs text-main focus:outline-none focus:border-brand transition-colors"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="ONBOARDING">En intégration</option>
            <option value="SUSPENDED">Suspendu</option>
            <option value="DEPARTED">A quitté l’entreprise</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
        </div>

        <!-- Account Link Filter -->
        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Compte utilisateur</label>
          <select
            v-model="selectedLinked"
            @change="handleSearch"
            class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs text-main focus:outline-none focus:border-brand transition-colors"
          >
            <option value="ALL">Tous</option>
            <option value="LINKED">Avec compte utilisateur</option>
            <option value="UNLINKED">Sans compte utilisateur</option>
          </select>
        </div>

        <!-- Include Archived Toggle -->
        <div class="flex items-center gap-2 pt-6">
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="includeArchived"
              @change="handleSearch"
              class="sr-only peer"
            />
            <div class="w-9 h-5 bg-panel-raised peer-focus:outline-none rounded-pill peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-custom after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
          </label>
          <span class="text-xs font-semibold text-main">Inclure les archivés</span>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>

      <div v-else-if="employees.length === 0" class="text-center py-16 space-y-3">
        <div class="w-12 h-12 rounded-card bg-panel-raised text-muted-custom flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <p class="text-xs font-semibold text-main">Aucun employé trouvé</p>
        <p class="text-xs text-muted-custom max-w-sm mx-auto">Modifiez les filtres de recherche ou ajoutez un nouveau collaborateur.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-custom bg-panel-raised text-xs font-bold text-muted-custom uppercase tracking-wider">
              <th class="py-3.5 px-4">Matricule</th>
              <th class="py-3.5 px-4">Collaborateur</th>
              <th class="py-3.5 px-4">Téléphone</th>
              <th class="py-3.5 px-4">Date d’embauche</th>
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4">Compte Utilisateur</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom text-xs">
            <tr
              v-for="emp in employees"
              :key="emp.id"
              class="hover:bg-surface-hover transition-colors"
            >
              <!-- Matricule -->
              <td class="py-3 px-4 font-mono font-bold text-brand-strong">
                {{ emp.employeeNumber }}
              </td>

              <!-- Employé -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-pill bg-brand-soft text-brand-strong font-bold flex items-center justify-center text-xs shrink-0 border border-brand-soft">
                    {{ getInitials(emp.displayName) }}
                  </div>
                  <div>
                    <NuxtLink :to="`/rh/employes/${emp.id}`" class="font-bold text-main hover:text-brand block">
                      {{ emp.displayName }}
                    </NuxtLink>
                    <div class="flex items-center gap-2 text-xs text-muted-custom">
                      <span>CIN: {{ emp.cinMasked || '-' }}</span>
                      <span v-if="emp.professionalEmail" class="text-muted-custom">• {{ emp.professionalEmail }}</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Téléphone -->
              <td class="py-3 px-4 text-secondary-custom font-mono">
                {{ emp.phonePrimary }}
              </td>

              <!-- Date d’embauche -->
              <td class="py-3 px-4 text-secondary-custom">
                {{ formatDate(emp.hireDate) }}
              </td>

              <!-- Statut -->
              <td class="py-3 px-4">
                <span class="px-2.5 py-0.5 rounded-pill text-xs font-bold inline-block" :class="getStatusBadgeClass(emp.employmentStatus)">
                  {{ getStatusLabel(emp.employmentStatus) }}
                </span>
              </td>

              <!-- Compte utilisateur -->
              <td class="py-3 px-4">
                <div v-if="emp.linkedUser" class="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ emp.linkedUser.email }}</span>
                </div>
                <span v-else class="text-xs text-muted-custom italic">Non lié</span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <NuxtLink
                    :to="`/rh/employes/${emp.id}`"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-main rounded-control transition-colors"
                    title="Consulter"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 01-6 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </NuxtLink>

                  <NuxtLink
                    :to="`/rh/employes/${emp.id}/modifier`"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-brand rounded-control transition-colors"
                    title="Modifier"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="pagination.totalPages > 1" class="px-4 py-3 bg-panel-raised border-t border-custom flex justify-between items-center text-xs">
        <span class="text-muted-custom">Page {{ pagination.page }} sur {{ pagination.totalPages }} ({{ pagination.totalItems }} employés)</span>
        <div class="flex gap-2">
          <button
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
            class="px-3 py-1 bg-panel hover:bg-surface-hover text-main rounded-control border border-custom disabled:opacity-40"
          >
            Précédent
          </button>
          <button
            :disabled="pagination.page >= pagination.totalPages"
            @click="changePage(pagination.page + 1)"
            class="px-3 py-1 bg-panel hover:bg-surface-hover text-main rounded-control border border-custom disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { definePageMeta } from '#imports'
import { useHrEmployees } from '~/composables/useHrEmployees'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { employees, pagination, loading, fetchEmployees } = useHrEmployees()

const searchQuery = ref('')
const selectedStatus = ref('ALL')
const selectedLinked = ref('ALL')
const includeArchived = ref(false)

function handleSearch() {
  fetchEmployees({
    page: 1,
    search: searchQuery.value,
    status: selectedStatus.value,
    linkedStatus: selectedLinked.value,
    includeArchived: includeArchived.value
  })
}

function changePage(p: number) {
  fetchEmployees({
    page: p,
    search: searchQuery.value,
    status: selectedStatus.value,
    linkedStatus: selectedLinked.value,
    includeArchived: includeArchived.value
  })
}

function getInitials(name: string): string {
  if (!name) return 'RH'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function formatDate(d: string | Date | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR')
}

function getStatusLabel(s: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Actif',
    ONBOARDING: 'En intégration',
    SUSPENDED: 'Suspendu',
    DEPARTED: 'A quitté',
    ARCHIVED: 'Archivé'
  }
  return map[s] || s
}

function getStatusBadgeClass(s: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    ONBOARDING: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    SUSPENDED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    DEPARTED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    ARCHIVED: 'bg-panel-raised text-muted-custom border border-custom'
  }
  return map[s] || 'bg-panel-raised text-secondary-custom'
}

onMounted(() => {
  fetchEmployees()
})
</script>
