<template>
  <div>
    <!-- Mobile Backdrop -->
    <div
      v-if="mobileOpen"
      @click="$emit('close-mobile')"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
    ></div>

    <!-- Sidebar Container -->
    <aside
      class="fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Brand Logo Header -->
      <div class="h-16 px-6 flex items-center justify-between border-b border-slate-800/80">
        <NuxtLink to="/" class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-bold flex items-center justify-center shadow-md shadow-amber-500/20 text-base">
            AB
          </div>
          <div>
            <span class="font-bold text-slate-100 tracking-tight text-base block leading-tight">Atlas Bites</span>
            <span class="text-[10px] text-amber-400 font-semibold uppercase tracking-wider block">Facturation</span>
          </div>
        </NuxtLink>

        <button
          @click="$emit('close-mobile')"
          class="lg:hidden text-slate-400 hover:text-white p-1"
          aria-label="Fermer le menu"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <!-- Tableau de bord -->
        <NuxtLink
          to="/"
          class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="route.path === '/' ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'"
        >
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Tableau de bord</span>
          </div>
        </NuxtLink>

        <!-- Clients -->
        <NuxtLink
          to="/clients"
          class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="route.path.startsWith('/clients') ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'"
        >
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Clients</span>
          </div>
        </NuxtLink>

        <!-- Devis -->
        <NuxtLink
          to="/devis"
          class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="route.path.startsWith('/devis') ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'"
        >
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Devis</span>
          </div>
        </NuxtLink>

        <!-- Factures -->
        <NuxtLink
          to="/factures"
          class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="route.path.startsWith('/factures') ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'"
        >
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Factures</span>
          </div>
        </NuxtLink>

        <!-- Activités (Super Admin Only) -->
        <NuxtLink
          v-if="user?.role === 'SUPER_ADMIN'"
          to="/activites"
          class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="route.path.startsWith('/activites') ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'"
        >
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span>Activités</span>
          </div>
        </NuxtLink>

        <!-- Paramètres (Super Admin Only) -->
        <NuxtLink
          v-if="user?.role === 'SUPER_ADMIN'"
          to="/parametres"
          class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="route.path.startsWith('/parametres') ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'"
        >
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Paramètres</span>
          </div>
        </NuxtLink>
      </nav>

      <!-- Footer Info -->
      <div class="p-4 border-t border-slate-800/80 text-xs text-slate-500 text-center">
        Atlas Bites SARL • v1.0.0
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  mobileOpen: boolean
}>()

defineEmits(['close-mobile'])

const route = useRoute()
const { user } = useAuth()
</script>
