<template>
  <header class="h-16 px-6 border-b border-custom flex items-center justify-between shrink-0 bg-shell rounded-t-shell">
    <!-- Left: Mobile Menu Toggle & Capsule Search Input -->
    <div class="flex items-center gap-4 flex-1 max-w-lg">
      <button
        @click="$emit('toggle-mobile')"
        class="lg:hidden text-secondary-custom hover:text-main p-2 rounded-control bg-panel border border-custom"
        aria-label="Ouvrir la navigation"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Capsule Search Field -->
      <div class="relative w-full max-w-md hidden sm:block">
        <svg class="w-4 h-4 text-muted-custom absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher clients, devis, factures, employés..."
          class="w-full bg-panel border border-custom text-main placeholder-muted-custom text-xs rounded-pill pl-10 pr-4 py-2 focus:outline-none focus:border-brand transition-colors"
          @keydown.enter="handleGlobalSearch"
        />
      </div>
    </div>

    <!-- Right: Quick Create, Theme Switcher, Notifications, User Avatar -->
    <div class="flex items-center gap-3">
      <!-- Quick Create Button Dropdown -->
      <div class="relative">
        <button
          @click="showQuickCreate = !showQuickCreate"
          class="px-3 py-1.5 bg-brand text-on-brand hover:bg-brand-strong font-bold text-xs rounded-pill shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden md:inline">Créer</span>
        </button>

        <div
          v-if="showQuickCreate"
          @click="showQuickCreate = false"
          class="fixed inset-0 z-40"
        ></div>

        <div
          v-if="showQuickCreate"
          class="absolute right-0 mt-2 w-48 bg-panel-raised border border-custom rounded-card shadow-lg z-50 py-1 text-xs"
        >
          <NuxtLink to="/clients/new" class="block px-4 py-2 text-main hover:bg-surface-hover font-semibold">
            + Nouveau Client
          </NuxtLink>
          <NuxtLink to="/devis/new" class="block px-4 py-2 text-main hover:bg-surface-hover font-semibold">
            + Nouveau Devis
          </NuxtLink>
          <NuxtLink to="/factures/new" class="block px-4 py-2 text-main hover:bg-surface-hover font-semibold">
            + Nouvelle Facture
          </NuxtLink>
          <NuxtLink v-if="canManageHr" to="/rh/employes/nouveau" class="block px-4 py-2 text-main hover:bg-surface-hover font-semibold border-t border-custom">
            + Nouvel Employé
          </NuxtLink>
        </div>
      </div>

      <!-- Theme Switcher -->
      <ThemeSwitcher />

      <!-- User Profile Chip & Logout -->
      <div class="flex items-center gap-2 pl-2 border-l border-custom">
        <div class="w-8 h-8 rounded-pill bg-brand-soft text-brand-strong font-bold flex items-center justify-center text-xs border border-brand-soft">
          {{ userInitials }}
        </div>

        <div class="hidden lg:block text-left text-xs">
          <div class="font-bold text-main leading-tight">{{ user?.name || 'Utilisateur' }}</div>
          <div class="text-xs text-muted-custom font-mono uppercase">{{ formatRole(user?.role) }}</div>
        </div>

        <button
          @click="handleLogout"
          class="p-1.5 text-muted-custom hover:text-rose-500 rounded-control transition-colors"
          title="Se déconnecter"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, navigateTo } from '#imports'
import { useAuth } from '~/composables/useAuth'
import ThemeSwitcher from '~/components/ui/ThemeSwitcher.vue'

defineEmits(['toggle-mobile'])

const router = useRouter()
const { user, logout } = useAuth()
const searchQuery = ref('')
const showQuickCreate = ref(false)

const canManageHr = computed(() => {
  const role = user.value?.role
  return role === 'SUPER_ADMIN' || role === 'HR_MANAGER'
})

const userInitials = computed(() => {
  const name = user.value?.name || 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.substring(0, 2).toUpperCase()
})

function formatRole(role?: string) {
  if (!role) return 'Membre'
  if (role === 'SUPER_ADMIN') return 'Super Admin'
  if (role === 'ADMIN') return 'Admin'
  if (role === 'HR_MANAGER') return 'Responsable RH'
  if (role === 'ACCOUNTANT') return 'Comptable'
  return role
}

function handleGlobalSearch() {
  if (!searchQuery.value.trim()) return
  const q = searchQuery.value.trim()
  router.push(`/clients?search=${encodeURIComponent(q)}`)
}

async function handleLogout() {
  await logout()
  await navigateTo('/login')
}
</script>
