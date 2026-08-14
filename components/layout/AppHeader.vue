<template>
  <header class="h-16 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
    <!-- Left: Mobile Toggle & Page Title -->
    <div class="flex items-center gap-3">
      <button
        @click="$emit('toggle-mobile')"
        class="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 focus:outline-none"
        aria-label="Ouvrir le menu"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 class="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
        {{ title }}
      </h1>
    </div>

    <!-- Right: User Menu & Actions -->
    <div class="flex items-center gap-3 sm:gap-4">
      <!-- Persistent Notification Center Bell -->
      <NotificationCenter />

      <div v-if="user" class="hidden sm:flex items-center gap-3 border-r border-slate-800 pr-4">
        <div class="text-right">
          <div class="text-xs font-semibold text-slate-200">{{ user.name }}</div>
          <div class="text-[11px] text-slate-400">{{ user.email }}</div>
        </div>
        <span
          class="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border"
          :class="getRoleBadgeClass(user.role)"
        >
          {{ formatRole(user.role) }}
        </span>
      </div>

      <button
        @click="handleLogout"
        :disabled="loading"
        class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span class="hidden xs:inline">Déconnexion</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { Role } from '@prisma/client'
import NotificationCenter from '~/components/layout/NotificationCenter.vue'

defineProps<{
  title?: string
}>()

defineEmits(['toggle-mobile'])

const { user, logout, loading } = useAuth()

function formatRole(role?: Role): string {
  if (!role) return 'Utilisateur'
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin'
    case 'ACCOUNTANT':
      return 'Comptable'
    case 'COMMERCIAL':
      return 'Commercial'
    default:
      return role
  }
}

function getRoleBadgeClass(role?: Role): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 'ACCOUNTANT':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    case 'COMMERCIAL':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30'
  }
}

async function handleLogout() {
  await logout()
}
</script>
