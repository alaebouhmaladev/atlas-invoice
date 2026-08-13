<template>
  <div class="space-y-6">
    <!-- Welcome Header Banner -->
    <div class="bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div class="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            Atlas Bites SARL • Espace CRM
          </div>

          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">
            Bienvenue, {{ user?.name || 'Gestionnaire' }} !
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Plateforme de gestion de facturation et suivi des clients traiteur.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <NuxtLink
            to="/clients/new"
            class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nouveau client</span>
          </NuxtLink>

          <NuxtLink
            to="/clients"
            class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            Voir les clients
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Module Clients</span>
          <span class="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
        </div>
        <div class="text-2xl font-bold text-slate-100 mt-2">Actif</div>
        <p class="text-[11px] text-slate-400 mt-1">Base clients opérationnelle avec ICE & IF</p>
      </div>

      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Devis</span>
          <span class="p-2 rounded-xl bg-slate-800 text-slate-500">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
        </div>
        <div class="text-2xl font-bold text-slate-500 mt-2">Phase 3</div>
        <p class="text-[11px] text-slate-500 mt-1">Bientôt disponible</p>
      </div>

      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Factures</span>
          <span class="p-2 rounded-xl bg-slate-800 text-slate-500">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </span>
        </div>
        <div class="text-2xl font-bold text-slate-500 mt-2">Phase 4</div>
        <p class="text-[11px] text-slate-500 mt-1">Bientôt disponible</p>
      </div>

      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sécurité & Role</span>
          <span class="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
        </div>
        <div class="text-lg font-bold text-slate-100 mt-2">{{ formatRole(user?.role) }}</div>
        <p class="text-[11px] text-slate-400 mt-1">Permissions vérifiées côté serveur</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Role } from '@prisma/client'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { user } = useAuth()

function formatRole(role?: Role): string {
  if (!role) return 'Utilisateur'
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrateur'
    case 'ACCOUNTANT':
      return 'Comptable'
    case 'COMMERCIAL':
      return 'Commercial'
    default:
      return role
  }
}
</script>
