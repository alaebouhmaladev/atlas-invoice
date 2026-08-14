<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink to="/parametres" class="text-xs text-slate-400 hover:text-amber-400 transition-colors">Paramètres</NuxtLink>
          <span class="text-slate-600 text-xs">/</span>
          <span class="text-xs text-amber-400 font-semibold">Utilisateurs</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-100 tracking-tight">Gestion des Utilisateurs</h1>
        <p class="text-xs text-slate-400 mt-0.5">Gérez les membres de votre équipe, leurs rôles et la sécurité d'accès au CRM.</p>
      </div>

      <div class="flex items-center gap-3">
        <NuxtLink
          to="/parametres"
          class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
        >
          Retour
        </NuxtLink>

        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nouvel utilisateur</span>
        </button>
      </div>
    </div>

    <!-- Alert Messages -->
    <div v-if="successMsg" class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
      {{ successMsg }}
    </div>
    <div v-if="errorMsg" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
      {{ errorMsg }}
    </div>

    <!-- Users Table Card -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
      <table class="w-full text-left text-xs text-slate-300">
        <thead class="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
          <tr>
            <th class="px-4 py-3">Utilisateur</th>
            <th class="px-4 py-3">Rôle</th>
            <th class="px-4 py-3">Statut</th>
            <th class="px-4 py-3">Sessions</th>
            <th class="px-4 py-3">Créé le</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          <tr v-for="u in users" :key="u.id" class="hover:bg-slate-800/40 transition-colors">
            <td class="px-4 py-3">
              <div class="font-bold text-slate-100">{{ u.name }}</div>
              <div class="text-[11px] text-slate-400">{{ u.email }}</div>
            </td>

            <td class="px-4 py-3">
              <span
                class="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1"
                :class="getRoleBadgeClass(u.role)"
              >
                {{ getRoleLabel(u.role) }}
              </span>
            </td>

            <td class="px-4 py-3">
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                :class="u.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'"
              >
                {{ u.isActive ? 'Actif' : 'Inactif' }}
              </span>
              <span v-if="u.mustChangePassword" class="ml-2 text-[10px] text-amber-400 font-semibold" title="Mot de passe temporaire à changer">
                ⚠️ MDP Temp
              </span>
            </td>

            <td class="px-4 py-3 font-mono text-[11px] text-slate-400">
              {{ u._count?.sessions || 0 }} session(s)
            </td>

            <td class="px-4 py-3 text-[11px] text-slate-400">
              {{ formatDate(u.createdAt) }}
            </td>

            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  v-if="u.isActive"
                  @click="toggleUserStatus(u)"
                  title="Désactiver l'utilisateur"
                  class="px-2.5 py-1 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 rounded-lg text-[11px] font-semibold transition-colors"
                >
                  Désactiver
                </button>
                <button
                  v-else
                  @click="toggleUserStatus(u)"
                  title="Réactiver l'utilisateur"
                  class="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 rounded-lg text-[11px] font-semibold transition-colors"
                >
                  Réactiver
                </button>

                <button
                  @click="openResetModal(u)"
                  title="Réinitialiser le mot de passe"
                  class="px-2.5 py-1 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 rounded-lg text-[11px] font-semibold transition-colors"
                >
                  Reset MDP
                </button>

                <button
                  @click="handleRevokeSessions(u)"
                  title="Révoquer les sessions actives"
                  class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[11px] font-semibold transition-colors"
                >
                  Révoquer
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create User Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <h2 class="text-lg font-bold text-slate-100">Créer un nouvel utilisateur</h2>
        <form @submit.prevent="handleCreateUser" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nom complet *</label>
            <input v-model="createForm.name" type="text" required placeholder="ex: Karim Benali" class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Adresse Email *</label>
            <input v-model="createForm.email" type="email" required placeholder="karim@atlasbites.ma" class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Rôle *</label>
            <select v-model="createForm.role" required class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40">
              <option value="COMMERCIAL">Commercial</option>
              <option value="ACCOUNTANT">Comptable</option>
              <option value="SUPER_ADMIN">Super Administrateur</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Mot de passe temporaire *</label>
            <input v-model="createForm.password" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Confirmer le mot de passe *</label>
            <input v-model="createForm.confirmPassword" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showCreateModal = false" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold">Annuler</button>
            <button type="submit" :disabled="modalLoading" class="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20">Créer l'utilisateur</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Admin Reset Password Modal -->
    <div v-if="showResetModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <h2 class="text-lg font-bold text-slate-100">Réinitialiser le mot de passe</h2>
        <p class="text-xs text-slate-400">Pour {{ selectedUser?.name }} ({{ selectedUser?.email }}). L'utilisateur devra obligatoirement le changer lors de sa prochaine connexion.</p>

        <form @submit.prevent="handleAdminReset" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nouveau mot de passe temporaire *</label>
            <input v-model="resetForm.newPassword" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Confirmer le nouveau mot de passe *</label>
            <input v-model="resetForm.confirmPassword" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button type="button" @click="showResetModal = false" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold">Annuler</button>
            <button type="submit" :disabled="modalLoading" class="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20">Réinitialiser le MDP</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const users = ref<any[]>([])
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)
const showCreateModal = ref(false)
const showResetModal = ref(false)
const modalLoading = ref(false)
const selectedUser = ref<any | null>(null)

const createForm = reactive({
  name: '',
  email: '',
  role: 'COMMERCIAL',
  password: '',
  confirmPassword: ''
})

const resetForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

const fetchUsersList = async () => {
  try {
    const res = await $fetch<any>('/api/admin/users', {
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success && res.data) {
      users.value = res.data
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Erreur lors de la récupération des utilisateurs'
  }
}

onMounted(fetchUsersList)

const getRoleBadgeClass = (role: string) => {
  if (role === 'SUPER_ADMIN') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  if (role === 'ACCOUNTANT') return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
  return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
}

const getRoleLabel = (role: string) => {
  if (role === 'SUPER_ADMIN') return 'Super Admin'
  if (role === 'ACCOUNTANT') return 'Comptable'
  return 'Commercial'
}

const formatDate = (d: string | Date) => {
  return new Date(d).toLocaleDateString('fr-FR')
}

const toggleUserStatus = async (user: any) => {
  successMsg.value = null
  errorMsg.value = null
  const endpoint = user.isActive ? `/api/admin/users/${user.id}/deactivate` : `/api/admin/users/${user.id}/activate`

  try {
    const res = await $fetch<any>(endpoint, {
      method: 'POST',
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      successMsg.value = user.isActive ? `L'utilisateur ${user.name} a été désactivé.` : `L'utilisateur ${user.name} a été réactivé.`
      await fetchUsersList()
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Erreur lors de la modification du statut'
  }
}

const handleCreateUser = async () => {
  modalLoading.value = true
  successMsg.value = null
  errorMsg.value = null

  try {
    const res = await $fetch<any>('/api/admin/users', {
      method: 'POST',
      body: createForm,
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      showCreateModal.value = false
      createForm.name = ''
      createForm.email = ''
      createForm.password = ''
      createForm.confirmPassword = ''
      successMsg.value = 'L\'utilisateur a été créé avec succès avec mot de passe temporaire.'
      await fetchUsersList()
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message || 'Erreur lors de la création de l\'utilisateur'
  } finally {
    modalLoading.value = false
  }
}

const openResetModal = (u: any) => {
  selectedUser.value = u
  resetForm.newPassword = ''
  resetForm.confirmPassword = ''
  showResetModal.value = true
}

const handleAdminReset = async () => {
  if (!selectedUser.value) return
  modalLoading.value = true
  successMsg.value = null
  errorMsg.value = null

  try {
    const res = await $fetch<any>(`/api/admin/users/${selectedUser.value.id}/reset-password`, {
      method: 'POST',
      body: resetForm,
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      showResetModal.value = false
      successMsg.value = `Le mot de passe de ${selectedUser.value.name} a été réinitialisé.`
      await fetchUsersList()
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message || 'Erreur lors du reset de mot de passe'
  } finally {
    modalLoading.value = false
  }
}

const handleRevokeSessions = async (u: any) => {
  successMsg.value = null
  errorMsg.value = null

  try {
    const res = await $fetch<any>(`/api/admin/users/${u.id}/revoke-sessions`, {
      method: 'POST',
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      successMsg.value = `Les sessions actives de ${u.name} ont été révoquées.`
      await fetchUsersList()
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Erreur lors de la récapitulation des sessions'
  }
}
</script>
