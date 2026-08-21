<template>
  <header class="h-16 bg-shell/80 backdrop-blur-md border-b border-custom sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between transition-colors">
    <!-- Left: Mobile Toggle & Page Title -->
    <div class="flex items-center gap-3">
      <button
        @click="$emit('toggle-mobile')"
        class="lg:hidden text-secondary-custom hover:text-main p-1.5 rounded-lg hover:bg-surface-hover focus:outline-none transition-colors"
        aria-label="Ouvrir le menu"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 class="text-base sm:text-lg font-bold text-main tracking-tight">
        {{ title }}
      </h1>
    </div>

    <!-- Right: Theme Switcher, Notification Center & User Info -->
    <div class="flex items-center gap-3 sm:gap-4">
      <!-- Theme Switcher (Light / Dark / System) -->
      <ThemeSwitcher />

      <!-- Persistent Notification Center Bell -->
      <NotificationCenter />

      <div v-if="user" class="hidden sm:flex items-center gap-3 border-r border-custom pr-4">
        <div class="text-right">
          <div class="text-xs font-semibold text-main leading-tight">{{ user.name }}</div>
          <div class="text-[11px] text-muted-custom leading-tight">{{ user.email }}</div>
        </div>
        <span
          class="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border transition-colors"
          :class="getRoleBadgeClass(user.role)"
        >
          {{ formatRole(user.role) }}
        </span>
      </div>

      <button
        @click="handleLogout"
        :disabled="loading"
        class="px-3 py-1.5 bg-surface hover:bg-surface-hover text-secondary-custom hover:text-main rounded-xl text-xs font-semibold border border-custom transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <svg class="w-4 h-4 text-muted-custom" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
import ThemeSwitcher from '~/components/ui/ThemeSwitcher.vue'
import { useAuth } from '~/composables/useAuth'

defineProps<{
  title?: string
}>()

defineEmits(['toggle-mobile'])

const { user, logout, loading } = useAuth()

function formatRole(role?: Role | string): string {
  if (!role) return 'Utilisateur'
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin'
    case 'HR_MANAGER':
      return 'Manager RH'
    case 'ACCOUNTANT':
      return 'Comptable'
    case 'COMMERCIAL':
      return 'Commercial'
    default:
      return String(role)
  }
}

function getRoleBadgeClass(role?: Role | string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-[#b49c80]/15 text-[#987d61] dark:text-[#d0baa0] border-[#b49c80]/30'
    case 'HR_MANAGER':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    case 'ACCOUNTANT':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'COMMERCIAL':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    default:
      return 'bg-surface-muted text-muted-custom border-custom'
  }
}

async function handleLogout() {
  await logout()
}
</script>
