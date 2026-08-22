<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink to="/parametres" class="text-xs text-muted-custom hover:text-brand transition-colors">Paramètres</NuxtLink>
          <span class="text-muted-custom text-xs">/</span>
          <span class="text-xs text-brand font-bold">Utilisateurs</span>
        </div>
        <h1 class="text-2xl font-extrabold text-main tracking-tight">Gestion des Utilisateurs</h1>
        <p class="text-xs text-muted-custom mt-0.5">Gérez les membres de votre équipe, leurs rôles et la sécurité d'accès au CRM.</p>
      </div>

      <div class="flex items-center gap-3">
        <NuxtLink
          to="/parametres"
          class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main font-bold rounded-pill text-xs border border-custom transition-colors"
        >
          Retour
        </NuxtLink>

        <button
          @click="showCreateModal = true"
          class="px-4 py-2 bg-brand hover:bg-brand-strong text-on-brand font-bold rounded-pill text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nouvel utilisateur</span>
        </button>
      </div>
    </div>

    <!-- Alert Messages -->
    <div v-if="successMsg" class="p-4 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold">
      {{ successMsg }}
    </div>
    <div v-if="errorMsg" class="p-4 rounded-card bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold">
      {{ errorMsg }}
    </div>

    <!-- Users Table Card -->
    <div class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <table class="w-full text-left text-xs text-main">
        <thead class="bg-panel-raised text-xs font-bold text-muted-custom uppercase tracking-wider border-b border-custom">
          <tr>
            <th class="px-4 py-3">Utilisateur</th>
            <th class="px-4 py-3">Rôle</th>
            <th class="px-4 py-3">Statut</th>
            <th class="px-4 py-3">Sessions</th>
            <th class="px-4 py-3">Créé le</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-custom">
          <tr v-for="u in users" :key="u.id" class="hover:bg-surface-hover transition-colors">
            <td class="px-4 py-3">
              <div class="font-bold text-main">{{ u.name }}</div>
              <div class="text-xs text-muted-custom">{{ u.email }}</div>
            </td>

            <td class="px-4 py-3">
              <span
                class="px-2.5 py-1 rounded-pill text-xs font-bold inline-flex items-center gap-1"
                :class="getRoleBadgeClass(u.role)"
              >
                {{ getRoleLabel(u.role) }}
              </span>
            </td>

            <td class="px-4 py-3">
              <span
                class="px-2.5 py-0.5 rounded-pill text-xs font-bold"
                :class="u.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'"
              >
                {{ u.isActive ? 'Actif' : 'Inactif' }}
              </span>
              <span v-if="u.mustChangePassword" class="ml-2 text-xs text-amber-600 dark:text-amber-400 font-bold" title="Mot de passe temporaire à changer">
                ⚠️ MDP Temp
              </span>
            </td>

            <td class="px-4 py-3 font-mono text-xs text-muted-custom font-bold">
              {{ u._count?.sessions || 0 }} session(s)
            </td>

            <td class="px-4 py-3 text-xs text-muted-custom font-mono">
              {{ formatDate(u.createdAt) }}
            </td>

            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  v-if="u.isActive"
                  @click="toggleUserStatus(u)"
                  title="Désactiver l'utilisateur"
                  class="px-2.5 py-1 bg-panel-raised hover:bg-rose-500/20 hover:text-rose-600 text-main rounded-control text-xs font-bold transition-colors cursor-pointer border border-custom"
                >
                  Désactiver
                </button>
                <button
                  v-else
                  @click="toggleUserStatus(u)"
                  title="Réactiver l'utilisateur"
                  class="px-2.5 py-1 bg-panel-raised hover:bg-emerald-500/20 hover:text-emerald-600 text-main rounded-control text-xs font-bold transition-colors cursor-pointer border border-custom"
                >
                  Réactiver
                </button>

                <button
                  @click="openResetModal(u)"
                  title="Réinitialiser le mot de passe"
                  class="px-2.5 py-1 bg-panel-raised hover:bg-brand-soft hover:text-brand-strong text-main rounded-control text-xs font-bold transition-colors cursor-pointer border border-custom"
                >
                  Reset MDP
                </button>

                <button
                  @click="handleRevokeSessions(u)"
                  title="Révoquer les sessions actives"
                  class="px-2 py-1 bg-panel-raised hover:bg-surface-hover text-muted-custom hover:text-main rounded-control text-xs font-bold transition-colors cursor-pointer border border-custom"
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
    <div v-if="showCreateModal" class="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-panel border border-custom rounded-panel p-6 shadow-2xl space-y-4">
        <h2 class="text-base font-bold text-main">Créer un nouvel utilisateur</h2>
        <form @submit.prevent="handleCreateUser" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Nom complet *</label>
            <input v-model="createForm.name" type="text" required placeholder="ex: Karim Benali" class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand" />
          </div>

          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Adresse Email *</label>
            <input v-model="createForm.email" type="email" required placeholder="karim@atlasbites.ma" class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand" />
          </div>

          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Rôle *</label>
            <select v-model="createForm.role" required class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand">
              <option value="COMMERCIAL">Commercial</option>
              <option value="ACCOUNTANT">Comptable</option>
              <option value="SUPER_ADMIN">Super Administrateur</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Mot de passe temporaire *</label>
            <input v-model="createForm.password" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand" />
          </div>

          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Confirmer le mot de passe *</label>
            <input v-model="createForm.confirmPassword" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand" />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-custom">
            <button type="button" @click="showCreateModal = false" class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main rounded-control text-xs font-semibold cursor-pointer border border-custom">Annuler</button>
            <button type="submit" :disabled="modalLoading" class="px-5 py-2 bg-brand hover:bg-brand-strong text-on-brand font-bold rounded-control text-xs shadow-sm cursor-pointer">Créer l'utilisateur</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Admin Reset Password Modal -->
    <div v-if="showResetModal" class="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-panel border border-custom rounded-panel p-6 shadow-2xl space-y-4">
        <h2 class="text-base font-bold text-main">Réinitialiser le mot de passe</h2>
        <p class="text-xs text-muted-custom">Pour {{ selectedUser?.name }} ({{ selectedUser?.email }}). L'utilisateur devra obligatoirement le changer lors de sa prochaine connexion.</p>

        <form @submit.prevent="handleAdminReset" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Nouveau mot de passe temporaire *</label>
            <input v-model="resetForm.newPassword" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand" />
          </div>

          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Confirmer le nouveau mot de passe *</label>
            <input v-model="resetForm.confirmPassword" type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand" />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-custom">
            <button type="button" @click="showResetModal = false" class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main rounded-control text-xs font-semibold cursor-pointer border border-custom">Annuler</button>
            <button type="submit" :disabled="modalLoading" class="px-5 py-2 bg-brand hover:bg-brand-strong text-on-brand font-bold rounded-control text-xs shadow-sm cursor-pointer">Réinitialiser le MDP</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

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
  if (role === 'SUPER_ADMIN') return 'bg-brand-soft text-brand-strong border border-brand-soft'
  if (role === 'ACCOUNTANT') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
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
