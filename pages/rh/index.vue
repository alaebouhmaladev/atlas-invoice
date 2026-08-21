<template>
  <div class="space-y-8">
    <!-- Header with Quick Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-main tracking-tight">Ressources Humaines</h1>
        <p class="text-xs text-secondary-custom mt-1">Socle RH, gestion des collaborateurs et traçabilité immuable</p>
      </div>

      <div class="flex flex-wrap gap-3">
        <NuxtLink
          to="/rh/employes"
          class="px-4 py-2.5 bg-panel-raised hover:bg-surface-hover text-main text-xs font-semibold rounded-control transition-all border border-custom flex items-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Annuaire des employés</span>
        </NuxtLink>

        <NuxtLink
          to="/rh/employes/nouveau"
          class="px-4 py-2.5 bg-brand hover:opacity-90 text-slate-950 text-xs font-bold rounded-pill transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nouveau collaborateur</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Phase Roadmap Placeholder Banner -->
    <div class="bg-brand-soft border border-brand-soft rounded-card p-4 flex items-start gap-3 shadow-soft">
      <div class="p-2 bg-brand-soft rounded-control text-brand-strong shrink-0">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="text-xs space-y-1">
        <h4 class="font-bold text-brand-strong">Module Ressources Humaines opérationnel</h4>
        <p class="text-secondary-custom leading-relaxed">
          Gestion des collaborateurs, organisation, contrats, documents, planning et pointage centralisée dans Atlas CRM.
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
    </div>

    <template v-else-if="hrOverview">
      <!-- Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <!-- Employés Actifs -->
        <div class="bg-panel border border-custom rounded-card p-4 space-y-2 shadow-soft">
          <span class="text-[11px] font-semibold text-muted-custom uppercase tracking-wider block">Actifs</span>
          <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {{ hrOverview.metrics.totalActive }}
          </div>
        </div>

        <!-- En Intégration -->
        <div class="bg-panel border border-custom rounded-card p-4 space-y-2 shadow-soft">
          <span class="text-[11px] font-semibold text-muted-custom uppercase tracking-wider block">En intégration</span>
          <div class="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
            {{ hrOverview.metrics.onboarding }}
          </div>
        </div>

        <!-- Suspendus -->
        <div class="bg-panel border border-custom rounded-card p-4 space-y-2 shadow-soft">
          <span class="text-[11px] font-semibold text-muted-custom uppercase tracking-wider block">Suspendus</span>
          <div class="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {{ hrOverview.metrics.suspended }}
          </div>
        </div>

        <!-- Départis -->
        <div class="bg-panel border border-custom rounded-card p-4 space-y-2 shadow-soft">
          <span class="text-[11px] font-semibold text-muted-custom uppercase tracking-wider block">A quitté</span>
          <div class="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {{ hrOverview.metrics.departed }}
          </div>
        </div>

        <!-- Archivés -->
        <div class="bg-panel border border-custom rounded-card p-4 space-y-2 shadow-soft">
          <span class="text-[11px] font-semibold text-muted-custom uppercase tracking-wider block">Archivés</span>
          <div class="text-2xl font-black text-muted-custom font-mono">
            {{ hrOverview.metrics.archived }}
          </div>
        </div>

        <!-- Nouveaux ce mois -->
        <div class="bg-panel border border-custom rounded-card p-4 space-y-2 shadow-soft">
          <span class="text-[11px] font-semibold text-muted-custom uppercase tracking-wider block">Nouveaux (mois)</span>
          <div class="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {{ hrOverview.metrics.newThisMonth }}
          </div>
        </div>
      </div>

      <!-- Content Sections (Recent Employees & Activity Log) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Dernières Fiches Collaborateurs (2 cols) -->
        <div class="lg:col-span-2 bg-panel border border-custom rounded-card p-6 space-y-4 shadow-soft">
          <div class="flex items-center justify-between border-b border-custom pb-4">
            <h3 class="text-xs font-bold text-main uppercase tracking-wider">Derniers collaborateurs ajoutés</h3>
            <NuxtLink to="/rh/employes" class="text-xs text-brand-strong hover:underline font-bold">
              Voir tout →
            </NuxtLink>
          </div>

          <div v-if="hrOverview.recentEmployees.length === 0" class="text-center py-8 text-xs text-muted-custom font-semibold">
            Aucun employé enregistré pour le moment.
          </div>

          <div v-else class="divide-y divide-custom">
            <div
              v-for="emp in hrOverview.recentEmployees"
              :key="emp.id"
              class="py-3 flex items-center justify-between hover:bg-surface-hover px-2 rounded-control transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-pill bg-brand-soft text-brand-strong border border-brand-soft font-bold flex items-center justify-center text-xs shrink-0">
                  {{ getInitials(emp.displayName) }}
                </div>
                <div>
                  <NuxtLink :to="`/rh/employes/${emp.id}`" class="text-xs font-bold text-main hover:text-brand block">
                    {{ emp.displayName }}
                  </NuxtLink>
                  <span class="text-[11px] font-mono text-brand-strong">{{ emp.employeeNumber }}</span>
                </div>
              </div>

              <div class="flex items-center gap-3 text-xs">
                <span class="px-2.5 py-0.5 rounded-pill text-[10px] font-bold" :class="getStatusBadgeClass(emp.employmentStatus)">
                  {{ getStatusLabel(emp.employmentStatus) }}
                </span>
                <span class="text-muted-custom text-[11px] font-mono">{{ formatDate(emp.hireDate) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Dernières Activités RH (1 col) -->
        <div class="bg-panel border border-custom rounded-card p-6 space-y-4 shadow-soft">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider border-b border-custom pb-4">
            Activités RH récentes
          </h3>

          <div v-if="hrOverview.recentActivities.length === 0" class="text-center py-8 text-xs text-muted-custom font-semibold">
            Aucune activité RH récente.
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="act in hrOverview.recentActivities"
              :key="act.id"
              class="flex items-start gap-3 border-b border-custom pb-3 last:border-0"
            >
              <div class="p-1.5 rounded-control bg-brand-soft text-brand-strong border border-brand-soft mt-0.5 shrink-0">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div class="space-y-0.5 text-xs">
                <p class="font-bold text-main">{{ formatHrAuditAction(act.action) }}</p>
                <p class="text-[11px] text-secondary-custom">
                  Par <strong class="text-main">{{ act.user?.name || 'Système' }}</strong>
                  <span class="ml-1 text-muted-custom">({{ formatDate(act.createdAt) }})</span>
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
import { formatHrAuditAction } from '~/utils/hrFormatters'

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
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    ONBOARDING: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
    SUSPENDED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    DEPARTED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    ARCHIVED: 'bg-surface-muted text-secondary-custom border border-custom'
  }
  return map[s] || 'bg-surface-muted text-secondary-custom'
}
</script>
