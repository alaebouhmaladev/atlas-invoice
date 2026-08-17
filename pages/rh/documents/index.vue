<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-100 tracking-tight">Documents RH</h1>
        <p class="text-xs text-slate-400 mt-1">Gérez les documents administratifs sécurisés des employés.</p>
      </div>

      <button
        @click="openUploadModal"
        class="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2 self-start sm:self-auto"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span>Ajouter un document</span>
      </button>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <!-- Search Input -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Recherche par titre</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="CIN, Contrat, CNSS, titre..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pl-9 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <svg class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Category Filter -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Catégorie</label>
          <select
            v-model="categoryFilter"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">Toutes les catégories</option>
            <option value="CIN">CIN / Pièce d'identité</option>
            <option value="CONTRACT">Contrat de travail</option>
            <option value="CNSS">Document CNSS</option>
            <option value="RIB">Attestation RIB</option>
            <option value="MEDICAL">Certificat médical</option>
            <option value="DIPLOMA">Diplôme / Attestation</option>
            <option value="WORK_PERMIT">Autorisation de travail</option>
            <option value="WARNING">Avertissement</option>
            <option value="RESIGNATION">Démission</option>
            <option value="TERMINATION">Fin de contrat</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>

        <!-- Expiration Filter -->
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Expiration sous</label>
          <select
            v-model="expiringFilter"
            class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value="">Toutes les expirations</option>
            <option value="30">30 jours</option>
            <option value="60">60 jours</option>
            <option value="90">90 jours</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Documents Table -->
    <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
      </div>

      <div v-else-if="documents.length === 0" class="text-center py-16 space-y-3">
        <div class="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <p class="text-xs font-semibold text-slate-400">Aucun document RH trouvé</p>
        <p class="text-[11px] text-slate-500 max-w-sm mx-auto">Modifiez les filtres de recherche ou ajoutez un nouveau document administratif.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th class="py-3.5 px-4">Employé</th>
              <th class="py-3.5 px-4">Titre du document</th>
              <th class="py-3.5 px-4">Catégorie</th>
              <th class="py-3.5 px-4">Version actuelle</th>
              <th class="py-3.5 px-4">Expiration</th>
              <th class="py-3.5 px-4">Confidentialité</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-xs">
            <tr v-for="d in documents" :key="d.id" class="hover:bg-slate-800/30 transition-colors">
              <!-- Employé -->
              <td class="py-3 px-4">
                <NuxtLink :to="`/rh/employes/${d.employeeId}`" class="font-bold text-slate-200 hover:text-amber-400 block">
                  {{ d.employee?.displayName || '-' }}
                </NuxtLink>
                <span class="text-[10px] font-mono text-slate-500 block">{{ d.employee?.employeeNumber }}</span>
              </td>

              <!-- Titre -->
              <td class="py-3 px-4 font-medium text-slate-200">
                {{ d.title }}
              </td>

              <!-- Catégorie -->
              <td class="py-3 px-4">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block" :class="getDocumentCategoryBadgeClass(d.category)">
                  {{ formatDocumentCategory(d.category) }}
                </span>
              </td>

              <!-- Version -->
              <td class="py-3 px-4 font-mono">
                <span v-if="d.currentVersion" class="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px] font-bold border border-slate-700">
                  v{{ d.currentVersion.versionNumber }}
                </span>
                <span v-else class="text-slate-500 italic text-[11px]">Aucun fichier</span>
              </td>

              <!-- Expiration -->
              <td class="py-3 px-4 text-slate-300">
                {{ formatHrDate(d.expirationDate) }}
              </td>

              <!-- Confidentialité -->
              <td class="py-3 px-4">
                <span v-if="d.isConfidential" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Confidentiel
                </span>
                <span v-else class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  Public interne
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <a
                    v-if="d.currentVersion"
                    :href="`/api/rh/documents/versions/${d.currentVersion.id}/download`"
                    target="_blank"
                    class="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition-colors flex items-center gap-1 font-bold text-xs"
                    title="Visionner le document"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Visionner</span>
                  </a>

                  <button
                    v-else
                    disabled
                    class="p-1.5 text-slate-600 cursor-not-allowed flex items-center gap-1 font-semibold text-xs opacity-50"
                    title="Aucune version téléversée"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 014.122-.863c4.478 0 8.268 2.943 9.542 7a9.97 9.97 0 01-2.499 4.237M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Visionner</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatDocumentCategory, getDocumentCategoryBadgeClass, formatHrDate } from '~/utils/hrFormatters'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const searchQuery = ref('')
const categoryFilter = ref('')
const expiringFilter = ref('')
const loading = ref(false)
const documents = ref<any[]>([])

const notify = useNotify()

watch([searchQuery, categoryFilter, expiringFilter], () => {
  loadDocuments()
}, { immediate: true })

async function loadDocuments() {
  loading.value = true
  try {
    const params: any = {
      search: searchQuery.value,
      category: categoryFilter.value || undefined,
      expiringInDays: expiringFilter.value || undefined
    }
    const res = await $fetch<any>('/api/rh/documents', { params })
    documents.value = res.data || []
  } catch (err: any) {
    notify.notifyError(err.data?.message || 'Erreur lors du chargement du coffre-fort documentaire.')
  } finally {
    loading.value = false
  }
}

function openUploadModal() {
  notify.info('Information', 'Téléversement sécurisé de pièce disponible sous peu.')
}
</script>
