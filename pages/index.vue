<template>
  <div class="min-h-screen bg-slate-950 flex flex-col">
    <!-- Header -->
    <header class="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-bold flex items-center justify-center shadow-md shadow-amber-500/20 text-lg"
          >
            AB
          </div>
          <div>
            <h1 class="font-bold text-slate-100 tracking-tight text-lg">Atlas Bites Facturation</h1>
            <p class="text-xs text-slate-400">Atlas Bites SARL • Invoicing CRM</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div v-if="user" class="hidden sm:flex items-center gap-3 border-r border-slate-800 pr-4">
            <div class="text-right">
              <div class="text-sm font-semibold text-slate-200">{{ user.name }}</div>
              <div class="text-xs text-slate-400">{{ user.email }}</div>
            </div>
            <span
              class="px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase border"
              :class="getRoleBadgeClass(user.role)"
            >
              {{ formatRole(user.role) }}
            </span>
          </div>

          <button
            @click="handleLogout"
            :disabled="loading"
            class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg class="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Body -->
    <main class="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full flex flex-col justify-center">
      <!-- Confirmation Banner -->
      <div
        class="bg-gradient-to-br from-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden"
      >
        <div
          class="absolute -right-12 -top-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"
        ></div>

        <div class="relative z-10">
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6"
          >
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Foundation & Authentication Active
          </div>

          <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight mb-4">
            Welcome, {{ user?.name || 'Administrator' }}!
          </h2>

          <p class="text-slate-300 text-base leading-relaxed mb-8 max-w-2xl">
            The technical foundation for <strong class="text-amber-400">Atlas Bites Facturation</strong> has been
            successfully established and verified. Database migrations, session authentication, user roles, security
            headers, and Argon2 password hashing are operational.
          </p>

          <!-- User Info Summary Card -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1"
                >Authenticated User</span
              >
              <span class="text-slate-100 font-medium text-sm block truncate">{{ user?.name }}</span>
              <span class="text-slate-400 text-xs truncate block">{{ user?.email }}</span>
            </div>

            <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1"
                >Assigned Role</span
              >
              <span class="text-slate-100 font-medium text-sm block">{{ formatRole(user?.role) }}</span>
              <span class="text-slate-400 text-xs block">Server Verified</span>
            </div>

            <div class="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1"
                >Session Security</span
              >
              <span class="text-emerald-400 font-medium text-sm block">HttpOnly Cookie</span>
              <span class="text-slate-400 text-xs block">SHA-256 Token Hash</span>
            </div>
          </div>

          <!-- Feature Status Info -->
          <div
            class="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-200/90 flex items-start gap-3"
          >
            <svg class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <strong class="font-semibold block mb-0.5">Phase 1 Complete</strong>
              Clients, Devis (Estimates), Factures (Invoices), Dashboard analytics, and Settings features are
              intentionally pending approval and will be built in subsequent phases.
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { Role } from '@prisma/client'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { user, logout, loading } = useAuth()

function formatRole(role?: Role): string {
  if (!role) return 'User'
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin'
    case 'ACCOUNTANT':
      return 'Accountant'
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
