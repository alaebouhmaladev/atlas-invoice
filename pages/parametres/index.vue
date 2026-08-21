<template>
  <div class="space-y-8">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-extrabold text-main tracking-tight">Paramètres du système</h1>
      <p class="text-xs text-muted-custom mt-1">Gérez la configuration de la plateforme Atlas CRM et la fiche légale de l'entreprise.</p>
    </div>

    <!-- Section 1: Application (Atlas CRM) -->
    <div class="space-y-4">
      <div class="flex items-center gap-2 border-b border-custom pb-2">
        <div class="w-2 h-2 rounded-full bg-[#b49c80]"></div>
        <h2 class="text-xs font-bold text-muted-custom uppercase tracking-wider">Application — {{ identity.productName }}</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Card Identity & Version -->
        <div class="p-5 bg-panel border border-custom rounded-card shadow-soft space-y-3">
          <div class="flex items-center justify-between">
            <div class="w-9 h-9 rounded-control bg-[#b49c80]/15 border border-[#b49c80]/30 text-[#987d61] dark:text-[#d0baa0] font-bold flex items-center justify-center text-sm">
              AB
            </div>
            <span class="px-2.5 py-1 rounded-pill text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              v{{ identity.version }}
            </span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-main">{{ identity.productName }}</h3>
            <p class="text-[11px] text-muted-custom mt-0.5">{{ identity.description }}</p>
          </div>
          <div class="pt-2 border-t border-custom flex items-center justify-between text-[11px] text-muted-custom">
            <span>Modules actifs :</span>
            <span class="font-bold text-main font-mono">{{ activeModules.length }} / {{ Object.keys(modules).length }}</span>
          </div>
        </div>

        <!-- Card Sécurité & Sessions -->
        <NuxtLink
          to="/parametres/securite"
          class="p-5 bg-panel hover:bg-surface-hover border border-custom hover:border-[#b49c80]/40 rounded-card transition-all group shadow-soft flex flex-col justify-between"
        >
          <div>
            <div class="w-9 h-9 rounded-control bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 class="text-sm font-bold text-main group-hover:text-[#b49c80] transition-colors">Sécurité & Sessions</h3>
            <p class="text-[11px] text-muted-custom mt-1">Mots de passe, révocations de sessions et journal d'audit de sécurité.</p>
          </div>
          <div class="text-[11px] text-[#987d61] dark:text-[#d0baa0] font-bold flex items-center gap-1 mt-3">
            <span>Gérer la sécurité</span>
            <span>&rarr;</span>
          </div>
        </NuxtLink>

        <!-- Card Sauvegardes & État -->
        <div class="p-5 bg-panel border border-custom rounded-card shadow-soft flex flex-col justify-between">
          <div>
            <div class="w-9 h-9 rounded-control bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h3 class="text-sm font-bold text-main">Sauvegardes & Diagnostic</h3>
            <p class="text-[11px] text-muted-custom mt-1">Sauvegardes PostgreSQL automatisées et état système via le CLI <code class="text-[#987d61] dark:text-[#d0baa0] bg-panel-raised px-1 py-0.5 rounded-control font-mono">atlascrm status</code>.</p>
          </div>
          <div class="pt-2 border-t border-custom flex items-center justify-between text-[11px] text-muted-custom mt-3">
            <span>Base de données :</span>
            <span class="text-emerald-600 dark:text-emerald-400 font-bold">Sauvegardée</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Entreprise (Atlas Bites SARL) -->
    <div class="space-y-4">
      <div class="flex items-center gap-2 border-b border-custom pb-2">
        <div class="w-2 h-2 rounded-full bg-sky-500"></div>
        <h2 class="text-xs font-bold text-muted-custom uppercase tracking-wider">Entreprise — Profil & Documents Légaux</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Card Fiche Entreprise -->
        <NuxtLink
          to="/parametres/entreprise"
          class="p-5 bg-panel hover:bg-surface-hover border border-custom hover:border-[#b49c80]/40 rounded-card transition-all group shadow-soft"
        >
          <div class="w-9 h-9 rounded-control bg-[#b49c80]/15 border border-[#b49c80]/30 text-[#987d61] dark:text-[#d0baa0] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M9 8h.01M15 16h.01M15 12h.01M15 8h.01M12 8h.01M12 12h.01M12 16h.01" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-main group-hover:text-[#b49c80] transition-colors">Fiche Entreprise</h3>
          <p class="text-[11px] text-muted-custom mt-1">Raison sociale légale, identifiants fiscaux (ICE, IF, RC, CNSS), adresse et coordonnées bancaires.</p>
        </NuxtLink>

        <!-- Card Documents & Préfixes -->
        <NuxtLink
          to="/parametres/documents"
          class="p-5 bg-panel hover:bg-surface-hover border border-custom hover:border-[#b49c80]/40 rounded-card transition-all group shadow-soft"
        >
          <div class="w-9 h-9 rounded-control bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-main group-hover:text-[#b49c80] transition-colors">Documents & Actifs</h3>
          <p class="text-[11px] text-muted-custom mt-1">Logo officiel, signature, cachet, préfixes de numérotation et paramètres PDF.</p>
        </NuxtLink>

        <!-- Card Utilisateurs -->
        <NuxtLink
          to="/utilisateurs"
          class="p-5 bg-panel hover:bg-surface-hover border border-custom hover:border-[#b49c80]/40 rounded-card transition-all group shadow-soft"
        >
          <div class="w-9 h-9 rounded-control bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 class="text-sm font-bold text-main group-hover:text-[#b49c80] transition-colors">Gestion des Utilisateurs</h3>
          <p class="text-[11px] text-muted-custom mt-1">Gestion des accès de l'équipe, attribution des rôles et réinitialisations.</p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports'
import { useAppIdentity } from '~/composables/useAppIdentity'
import { useModules } from '~/composables/useModules'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const identity = useAppIdentity()
const { modules, activeModules } = useModules()
</script>
