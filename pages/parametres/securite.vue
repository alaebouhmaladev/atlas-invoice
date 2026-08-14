<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink to="/parametres" class="text-xs text-slate-400 hover:text-amber-400 transition-colors">Paramètres</NuxtLink>
          <span class="text-slate-600 text-xs">/</span>
          <span class="text-xs text-amber-400 font-semibold">Sécurité</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-100 tracking-tight">Sécurité du Compte & Sessions</h1>
        <p class="text-xs text-slate-400 mt-0.5">Modifiez votre mot de passe et gérez vos appareils et sessions actives.</p>
      </div>

      <NuxtLink
        to="/parametres"
        class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
      >
        Retour
      </NuxtLink>
    </div>

    <!-- Alert Messages -->
    <div v-if="successMsg" class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
      {{ successMsg }}
    </div>
    <div v-if="errorMsg" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
      {{ errorMsg }}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Change Password Card -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 class="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Modifier mon mot de passe</span>
        </h2>

        <form @submit.prevent="handleChangePassword" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Mot de passe actuel *</label>
            <input v-model="passForm.currentPassword" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nouveau mot de passe *</label>
            <input v-model="passForm.newPassword" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
            <p class="text-[11px] text-slate-500 mt-1">12 caractères min., majuscule, minuscule, chiffre et caractère spécial.</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Confirmer le nouveau mot de passe *</label>
            <input v-model="passForm.confirmPassword" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            <span>Mettre à jour le mot de passe</span>
          </button>
        </form>
      </div>

      <!-- Active Sessions Card -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <h2 class="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Sessions Actives</span>
          </h2>
          <button
            @click="handleLogoutOthers"
            class="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-[11px] font-semibold transition-colors"
          >
            Déconnecter autres appareils
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-100">Session Web</span>
                <span v-if="s.isCurrent" class="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Appareil Actuel
                </span>
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5">
                Créée le {{ formatDate(s.createdAt) }} • Expire le {{ formatDate(s.expiresAt) }}
              </div>
            </div>

            <button
              v-if="!s.isCurrent"
              @click="handleRevokeSession(s.id)"
              class="px-2.5 py-1 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 rounded-lg text-[11px] font-semibold transition-colors"
            >
              Révoquer
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const loading = ref(false)
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)
const sessions = ref<any[]>([])

const passForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const fetchSessions = async () => {
  try {
    const res = await $fetch<any>('/api/auth/sessions', {
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success && res.data) {
      sessions.value = res.data
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Erreur lors du chargement des sessions'
  }
}

onMounted(fetchSessions)

const formatDate = (d: string | Date) => {
  return new Date(d).toLocaleString('fr-FR')
}

const handleChangePassword = async () => {
  loading.value = true
  successMsg.value = null
  errorMsg.value = null

  try {
    const res = await $fetch<any>('/api/auth/change-password', {
      method: 'POST',
      body: passForm,
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      passForm.currentPassword = ''
      passForm.newPassword = ''
      passForm.confirmPassword = ''
      successMsg.value = 'Votre mot de passe a été modifié avec succès. Les autres sessions ont été révoquées.'
      await fetchSessions()
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message || 'Erreur lors de la modification'
  } finally {
    loading.value = false
  }
}

const handleRevokeSession = async (sessionId: string) => {
  successMsg.value = null
  errorMsg.value = null

  try {
    const res = await $fetch<any>(`/api/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      successMsg.value = 'La session a été révoquée.'
      await fetchSessions()
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Erreur lors de la révocation'
  }
}

const handleLogoutOthers = async () => {
  successMsg.value = null
  errorMsg.value = null

  try {
    const res = await $fetch<any>('/api/auth/logout-others', {
      method: 'POST',
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      successMsg.value = 'Toutes les autres sessions ont été révoquées.'
      await fetchSessions()
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Erreur lors de la déconnexion'
  }
}
</script>
