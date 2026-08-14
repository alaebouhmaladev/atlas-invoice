<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
      <!-- Icon & Header -->
      <div class="text-center mb-6">
        <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-slate-100">Modification du mot de passe</h1>
        <p v-if="user?.mustChangePassword" class="text-xs text-amber-400 font-semibold mt-1">
          Vous devez modifier votre mot de passe temporaire pour continuer.
        </p>
        <p v-else class="text-xs text-slate-400 mt-1">
          Définissez un nouveau mot de passe sécurisé pour votre compte.
        </p>
      </div>

      <!-- Error alert -->
      <div v-if="errorMessage" class="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
        {{ errorMessage }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Mot de passe actuel</label>
          <input
            v-model="form.currentPassword"
            type="password"
            required
            placeholder="••••••••••••"
            class="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nouveau mot de passe</label>
          <input
            v-model="form.newPassword"
            type="password"
            required
            placeholder="••••••••••••"
            class="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          <p class="text-[11px] text-slate-500 mt-1">
            Au moins 12 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial.
          </p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Confirmer le nouveau mot de passe</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            required
            placeholder="••••••••••••"
            class="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Enregistrer le nouveau mot de passe</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: false
})

const { user, fetchUser } = useAuth()
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const handleSubmit = async () => {
  errorMessage.value = null
  if (form.newPassword !== form.confirmPassword) {
    errorMessage.value = 'Les mots de passe ne correspondent pas.'
    return
  }

  loading.value = true
  try {
    const res = await $fetch<any>('/api/auth/change-password', {
      method: 'POST',
      body: form,
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      await fetchUser()
      navigateTo('/')
    }
  } catch (err: any) {
    errorMessage.value = err.data?.message || err.message || 'Erreur lors du changement de mot de passe'
  } finally {
    loading.value = false
  }
}
</script>
