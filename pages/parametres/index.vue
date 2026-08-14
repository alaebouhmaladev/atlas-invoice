<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-100 tracking-tight">Paramètres de l'application</h1>
      <p class="text-xs text-slate-400 mt-1">Gérez les informations d'Atlas Bites, la fiscalité, les modèles de documents et la sécurité des utilisateurs.</p>
    </div>

    <!-- Cards Grid Navigation -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card Entreprise -->
      <NuxtLink
        to="/parametres/entreprise"
        class="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl transition-all group shadow-lg"
      >
        <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-1-4h.01M9 16h.01M9 12h.01M9 8h.01M15 16h.01M15 12h.01M15 8h.01M12 8h.01M12 12h.01M12 16h.01" />
          </svg>
        </div>
        <h2 class="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">Fiche Entreprise</h2>
        <p class="text-[11px] text-slate-400 mt-1">Raison sociale, identifiants fiscaux (ICE, IF, RC), adresse et coordonnées bancaires.</p>
      </NuxtLink>

      <!-- Card Documents -->
      <NuxtLink
        to="/parametres/documents"
        class="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl transition-all group shadow-lg"
      >
        <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 class="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">Documents & Préfixes</h2>
        <p class="text-[11px] text-slate-400 mt-1">Préfixes devis/factures, logo, signature, cachet et options de personnalisation.</p>
      </NuxtLink>

      <!-- Card Utilisateurs -->
      <NuxtLink
        to="/parametres/utilisateurs"
        class="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl transition-all group shadow-lg"
      >
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h2 class="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">Gestion des Utilisateurs</h2>
        <p class="text-[11px] text-slate-400 mt-1">Gestion de l'équipe, rôles (Admin, Comptable, Commercial), réinitialisations.</p>
      </NuxtLink>

      <!-- Card Sécurité -->
      <NuxtLink
        to="/parametres/securite"
        class="p-5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl transition-all group shadow-lg"
      >
        <div class="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 class="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">Sécurité & Sessions</h2>
        <p class="text-[11px] text-slate-400 mt-1">Changement de mot de passe personnel, révocations de sessions et journal de sécurité.</p>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})
</script>
