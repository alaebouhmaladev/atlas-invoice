<template>
  <div class="space-y-8">
    <!-- Header with Quick Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-100 tracking-tight">Ressources Humaines</h1>
        <p class="text-xs text-slate-400 mt-1">Socle RH, gestion des collaborateurs et traçabilité immuable</p>
      </div>

      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/rh/employes"
          class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-700/80 flex items-center gap-2"
        >
          <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Annuaire des employés</span>
        </NuxtLink>

        <NuxtLink
          to="/rh/employes/nouveau"
          class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nouveau collaborateur</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Phase Roadmap Placeholder Banner -->
    <div class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
      <div class="p-2 bg-amber-500/20 rounded-xl text-amber-400 shrink-0">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="text-xs space-y-1">
        <h4 class="font-bold text-amber-300">Information Feuille de Route RH — Phase 1 Active</h4>
        <p class="text-slate-300 leading-relaxed">
          Le socle de gestion des fiches employés et la sécurité des données RH sont opérationnels.
          Les plannings, feuilles de temps, demandes de congés et bulletins de paie seront intégrés dans les phases 2 à 8.
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
    </div>

    <template v-else-if="hrOverview">
      <!-- Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <!-- Employés Actifs -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Actifs</span>
          <div class="text-2xl font-extrabold text-emerald-400">
            {{ hrOverview.metrics.totalActive }}
          </div>
        </div>

        <!-- En Intégration -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">En intégration</span>
          <div class="text-2xl font-extrabold text-blue-400">
            {{ hrOverview.metrics.onboarding }}
          </div>
        </div>

        <!-- Suspendus -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Suspendus</span>
          <div class="text-2xl font-extrabold text-amber-400">
            {{ hrOverview.metrics.suspended }}
          </div>
        </div>

        <!-- Départis -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">A quitté</span>
          <div class="text-2xl font-extrabold text-rose-400">
            {{ hrOverview.metrics.departed }}
          </div>
        </div>

        <!-- Archivés -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Archivés</span>
          <div class="text-2xl font-extrabold text-slate-400">
            {{ hrOverview.metrics.archived }}
          </div>
        </div>

        <!-- Nouveaux ce mois -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Nouveaux (mois)</span>
          <div class="text-2xl font-extrabold text-purple-400">
            {{ hrOverview.metrics.newThisMonth }}
          </div>
        </div>
      </div>

      <!-- Content Sections (Recent Employees & Activity Log) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Dernières Fiches Collaborateurs (2 cols) -->
        <div class="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 class="text-sm font-bold text-slate-200 uppercase tracking-wider">Derniers collaborateurs ajoutés</h3>
            <NuxtLink to="/rh/employes" class="text-xs text-amber-400 hover:text-amber-300 font-semibold">
              Voir tout →
            </NuxtLink>
          </div>

          <div v-if="hrOverview.recentEmployees.length === 0" class="text-center py-8 text-xs text-slate-500">
            Aucun employé enregistré pour le moment.
          </div>

          <div v-else class="divide-y divide-slate-800/60">
            <div
              v-for="emp in hrOverview.recentEmployees"
              :key="emp.id"
              class="py-3 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-xs">
                  {{ getInitials(emp.displayName) }}
                </div>
                <div>
                  <NuxtLink :to="`/rh/employes/${emp.id}`" class="text-xs font-bold text-slate-200 hover:text-amber-400 block">
                    {{ emp.displayName }}
                  </NuxtLink>
                  <span class="text-[11px] font-mono text-slate-400">{{ emp.employeeNumber }}</span>
                </div>
              </div>

              <div class="flex items-center gap-3 text-xs">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold" :class="getStatusBadgeClass(emp.employmentStatus)">
                  {{ getStatusLabel(emp.employmentStatus) }}
                </span>
                <span class="text-slate-400 text-[11px]">{{ formatDate(emp.hireDate) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Dernières Activités RH (1 col) -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 class="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-4">
            Activités RH récentes
          </h3>

          <div v-if="hrOverview.recentActivities.length === 0" class="text-center py-8 text-xs text-slate-500">
            Aucune activité RH récente.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="act in hrOverview.recentActivities"
              :key="act.id"
              class="flex items-start gap-3 border-b border-slate-800/40 pb-3 last:border-0"
            >
              <div class="p-1.5 rounded-lg bg-slate-800 text-amber-400 mt-0.5 shrink-0">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div class="space-y-0.5 text-xs">
                <p class="font-semibold text-slate-200">{{ formatHrAction(act.action) }}</p>
                <p class="text-[11px] text-slate-400">
                  Par <strong class="text-slate-300">{{ act.user?.name || 'Système' }}</strong>
                  <span class="ml-1 text-slate-500">({{ formatDate(act.createdAt) }})</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useHrEmployees } from '~/composables/useHrEmployees'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { hrOverview, loading, fetchOverview } = useHrEmployees()

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
    ACTIVE: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    ONBOARDING: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    SUSPENDED: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    DEPARTED: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    ARCHIVED: 'bg-slate-800 text-slate-400 border border-slate-700'
  }
  return map[s] || 'bg-slate-800 text-slate-300'
}

function formatHrAction(a: string): string {
  const map: Record<string, string> = {
    HR_EMPLOYEE_CREATED: 'Création d’un collaborateur',
    HR_EMPLOYEE_UPDATED: 'Modification de fiche employé',
    HR_EMPLOYEE_ARCHIVED: 'Archivage d’un employé',
    HR_EMPLOYEE_RESTORED: 'Restauration d’un employé',
    HR_EMPLOYEE_USER_LINKED: 'Liage de compte utilisateur',
    HR_EMPLOYEE_USER_UNLINKED: 'Déliage de compte utilisateur',
    HR_SALARY_CHANGED: 'Modification de salaire',
    HR_SENSITIVE_DATA_VIEWED: 'Consultation de données sensibles'
  }
  return map[a] || a
}

onMounted(() => {
  fetchOverview()
})
</script>
