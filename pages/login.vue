<template>
  <div class="min-h-full flex items-center justify-center p-4 py-12">
    <div class="w-full max-w-md bg-panel border border-custom rounded-panel p-8 shadow-soft">
      <!-- Branding & Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-panel bg-brand text-slate-950 shadow-sm mb-4 font-black text-2xl tracking-tighter">
          AB
        </div>
        <h1 class="text-2xl font-extrabold text-main tracking-tight">Atlas CRM</h1>
        <p class="text-xs text-muted-custom mt-1 uppercase tracking-widest font-bold">Atlas Bites SARL · Platforme RH & CRM</p>
      </div>

      <!-- Error Alert -->
      <div
        v-if="error"
        class="mb-6 p-4 rounded-card bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-start gap-3"
        role="alert"
      >
        <svg class="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div class="flex-1">{{ error }}</div>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label for="email" class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-2">
            Adresse email
          </label>
          <div class="relative">
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="admin@atlasbites.ma"
              :disabled="loading"
              class="w-full px-4 py-3 bg-panel-raised border border-custom rounded-control text-main placeholder:text-muted-custom focus:outline-none focus:border-brand transition-all disabled:opacity-50 text-xs font-medium"
            />
          </div>
        </div>

        <div>
          <label for="password" class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-2">
            Mot de passe
          </label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              autocomplete="current-password"
              placeholder="••••••••••••"
              :disabled="loading"
              class="w-full pl-4 pr-12 py-3 bg-panel-raised border border-custom rounded-control text-main placeholder:text-muted-custom focus:outline-none focus:border-brand transition-all disabled:opacity-50 text-xs font-medium"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-custom hover:text-main transition-colors p-1 cursor-pointer"
              :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
            >
              <svg v-if="!showPassword" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.959 8.959 0 013.682-.863c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21f-9-9" />
              </svg>
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3.5 px-4 bg-brand hover:opacity-90 text-slate-950 font-bold rounded-pill shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs mt-2 cursor-pointer"
        >
          <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ loading ? 'Connexion en cours...' : 'Se connecter au tableau de bord' }}</span>
        </button>
      </form>

      <!-- Footer Note -->
      <div class="mt-8 text-center border-t border-custom pt-4">
        <p class="text-xs text-muted-custom">Atlas CRM • Plateforme de Gestion d’Entreprise</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  middleware: 'guest',
  layout: 'default'
})

const email = ref('')
const password = ref('')
const showPassword = ref(false)

const { login, loading, error } = useAuth()

async function handleLogin() {
  const success = await login(email.value, password.value)
  if (success) {
    await navigateTo('/')
  }
}
</script>
