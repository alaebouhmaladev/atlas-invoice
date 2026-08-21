<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink to="/parametres" class="text-xs text-muted-custom hover:text-brand transition-colors">Paramètres</NuxtLink>
          <span class="text-muted-custom text-xs">/</span>
          <span class="text-xs text-brand font-bold">Documents & Préfixes</span>
        </div>
        <h1 class="text-2xl font-extrabold text-main tracking-tight">Modèles & Préfixes de Numérotation</h1>
        <p class="text-xs text-muted-custom mt-0.5">Configurez les préfixes de séquences officielles, les visuels (Logo, Cachet, Signature) et les valeurs par défaut.</p>
      </div>

      <NuxtLink
        to="/parametres"
        class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main font-bold rounded-pill text-xs border border-custom transition-colors"
      >
        Retour
      </NuxtLink>
    </div>

    <!-- Alert Messages -->
    <div v-if="successMsg" class="p-4 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold">
      {{ successMsg }}
    </div>
    <div v-if="errorMsg" class="p-4 rounded-card bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold">
      {{ errorMsg }}
    </div>

    <!-- 1. Assets Cards Section (Logo, Signature, Stamp) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Logo Card -->
      <div class="bg-panel border border-custom rounded-panel p-5 shadow-soft flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold text-main uppercase tracking-wider">Logo de l'entreprise</h3>
            <span class="text-[10px] px-2 py-0.5 rounded-pill font-bold" :class="form.activeLogoAssetId ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-panel-raised text-muted-custom border border-custom'">
              {{ form.activeLogoAssetId ? 'Configuré' : 'Aucun fichier' }}
            </span>
          </div>

          <div class="w-full h-32 rounded-card bg-panel-raised border border-dashed border-custom flex items-center justify-center overflow-hidden mb-3 p-2">
            <img v-if="form.activeLogoAssetId" :src="`/api/settings/assets/${form.activeLogoAssetId}`" alt="Logo preview" class="max-h-full max-w-full object-contain" />
            <div v-else class="text-center text-muted-custom">
              <svg class="w-8 h-8 mx-auto mb-1 text-muted-custom" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-[11px]">Format PNG/JPEG (Max 2 Mo)</span>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label class="block w-full text-center py-2 bg-panel-raised hover:bg-surface-hover text-main font-bold rounded-control text-xs cursor-pointer border border-custom transition-colors">
            <span>{{ form.activeLogoAssetId ? 'Remplacer le logo' : 'Téléverser le logo' }}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="(e) => handleFileUpload(e, 'logo')" />
          </label>

          <button
            v-if="form.activeLogoAssetId"
            type="button"
            @click="handleRemoveAsset('logo')"
            class="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold rounded-control text-[11px] border border-rose-500/20 transition-colors cursor-pointer"
          >
            Supprimer de la configuration
          </button>
        </div>
      </div>

      <!-- Signature Card -->
      <div class="bg-panel border border-custom rounded-panel p-5 shadow-soft flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold text-main uppercase tracking-wider">Signature autorisée</h3>
            <span class="text-[10px] px-2 py-0.5 rounded-pill font-bold" :class="form.activeSignatureAssetId ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-panel-raised text-muted-custom border border-custom'">
              {{ form.activeSignatureAssetId ? 'Configurée' : 'Aucun fichier' }}
            </span>
          </div>

          <div class="w-full h-32 rounded-card bg-panel-raised border border-dashed border-custom flex items-center justify-center overflow-hidden mb-3 p-2">
            <img v-if="form.activeSignatureAssetId" :src="`/api/settings/assets/${form.activeSignatureAssetId}`" alt="Signature preview" class="max-h-full max-w-full object-contain" />
            <div v-else class="text-center text-muted-custom">
              <svg class="w-8 h-8 mx-auto mb-1 text-muted-custom" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span class="text-[11px]">Format PNG/JPEG (Max 1 Mo)</span>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label class="block w-full text-center py-2 bg-panel-raised hover:bg-surface-hover text-main font-bold rounded-control text-xs cursor-pointer border border-custom transition-colors">
            <span>{{ form.activeSignatureAssetId ? 'Remplacer la signature' : 'Téléverser la signature' }}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="(e) => handleFileUpload(e, 'signature')" />
          </label>

          <button
            v-if="form.activeSignatureAssetId"
            type="button"
            @click="handleRemoveAsset('signature')"
            class="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold rounded-control text-[11px] border border-rose-500/20 transition-colors cursor-pointer"
          >
            Supprimer de la configuration
          </button>
        </div>
      </div>

      <!-- Stamp / Cachet Card -->
      <div class="bg-panel border border-custom rounded-panel p-5 shadow-soft flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-xs font-bold text-main uppercase tracking-wider">Cachet d'entreprise</h3>
            <span class="text-[10px] px-2 py-0.5 rounded-pill font-bold" :class="form.activeStampAssetId ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-panel-raised text-muted-custom border border-custom'">
              {{ form.activeStampAssetId ? 'Configuré' : 'Aucun fichier' }}
            </span>
          </div>

          <div class="w-full h-32 rounded-card bg-panel-raised border border-dashed border-custom flex items-center justify-center overflow-hidden mb-3 p-2">
            <img v-if="form.activeStampAssetId" :src="`/api/settings/assets/${form.activeStampAssetId}`" alt="Cachet preview" class="max-h-full max-w-full object-contain" />
            <div v-else class="text-center text-muted-custom">
              <svg class="w-8 h-8 mx-auto mb-1 text-muted-custom" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span class="text-[11px]">Format PNG/JPEG (Max 1 Mo)</span>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <label class="block w-full text-center py-2 bg-panel-raised hover:bg-surface-hover text-main font-bold rounded-control text-xs cursor-pointer border border-custom transition-colors">
            <span>{{ form.activeStampAssetId ? 'Remplacer le cachet' : 'Téléverser le cachet' }}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="(e) => handleFileUpload(e, 'stamp')" />
          </label>

          <button
            v-if="form.activeStampAssetId"
            type="button"
            @click="handleRemoveAsset('stamp')"
            class="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold rounded-control text-[11px] border border-rose-500/20 transition-colors cursor-pointer"
          >
            Supprimer de la configuration
          </button>
        </div>
      </div>
    </div>

    <!-- 2. Form Settings Section -->
    <form @submit.prevent="handleSave" class="bg-panel border border-custom rounded-panel p-6 shadow-soft space-y-6">
      <!-- Options d'affichage visuel -->
      <div>
        <h2 class="text-sm font-bold text-main border-b border-custom pb-2 mb-4">Affichage des visuels sur les documents PDF</h2>
        <div class="space-y-3">
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="form.showLogoOnDocuments" type="checkbox" class="w-4 h-4 rounded bg-panel-raised border-custom text-brand focus:ring-brand/40" />
            <span class="text-xs text-main font-bold">Afficher le logo sur les entêtes des devis et factures</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="form.showSignatureOnPaidInvoice" type="checkbox" class="w-4 h-4 rounded bg-panel-raised border-custom text-brand focus:ring-brand/40" />
            <span class="text-xs text-main font-bold">Afficher la signature électronique sur les factures acquittées</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input v-model="form.showStampOnPaidInvoice" type="checkbox" class="w-4 h-4 rounded bg-panel-raised border-custom text-brand focus:ring-brand/40" />
            <span class="text-xs text-main font-bold">Afficher le cachet d'entreprise sur les factures acquittées</span>
          </label>
        </div>
      </div>

      <!-- Préfixes de numérotation -->
      <div>
        <h2 class="text-sm font-bold text-main border-b border-custom pb-2 mb-4">Préfixes des numéros officiels</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Préfixe Devis (ex: DEV)</label>
            <input
              v-model="form.quotePrefix"
              type="text"
              required
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono uppercase"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Préfixe Factures (ex: FAC)</label>
            <input
              v-model="form.invoicePrefix"
              type="text"
              required
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono uppercase"
            />
          </div>
        </div>
      </div>

      <!-- Delais & TVA par défaut -->
      <div>
        <h2 class="text-sm font-bold text-main border-b border-custom pb-2 mb-4">Valeurs par défaut</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Validité des devis (jours)</label>
            <input
              v-model.number="form.defaultQuoteValidityDays"
              type="number"
              min="1"
              max="365"
              required
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Échéance des factures (jours)</label>
            <input
              v-model.number="form.defaultInvoiceDueDays"
              type="number"
              min="1"
              max="365"
              required
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Taux de TVA par défaut (%)</label>
            <input
              v-model.number="form.defaultVatRate"
              type="number"
              min="0"
              max="100"
              required
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono"
            />
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-custom">
        <button
          type="submit"
          :disabled="loading"
          class="px-6 py-2.5 bg-[#b49c80] hover:bg-[#987d61] text-slate-950 font-bold rounded-pill text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Enregistrer les préférences</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const loading = ref(false)
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

const form = reactive({
  legalName: '',
  tradeName: '',
  quotePrefix: 'DEV',
  invoicePrefix: 'FAC',
  defaultCurrency: 'MAD',
  defaultVatRate: 20,
  defaultQuoteValidityDays: 30,
  defaultInvoiceDueDays: 30,
  showSignatureOnPaidInvoice: true,
  showStampOnPaidInvoice: true,
  showLogoOnDocuments: true,
  activeLogoAssetId: null as string | null,
  activeSignatureAssetId: null as string | null,
  activeStampAssetId: null as string | null,
  revision: 1
})

const fetchSettings = async () => {
  try {
    const res = await $fetch<any>('/api/settings/company', {
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success && res.data) {
      Object.assign(form, res.data)
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Erreur lors du chargement de la configuration'
  }
}

onMounted(fetchSettings)

const { user } = useAuth()
const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')

const handleFileUpload = async (event: Event, type: 'logo' | 'signature' | 'stamp') => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  if (!isSuperAdmin.value) {
    errorMsg.value = 'Seul un Super Administrateur est autorisé à modifier les visuels officiels.'
    target.value = ''
    return
  }

  const isReplacing = (type === 'logo' && form.activeLogoAssetId) ||
                      (type === 'signature' && form.activeSignatureAssetId) ||
                      (type === 'stamp' && form.activeStampAssetId)

  if (isReplacing) {
    const confirmed = confirm(`Êtes-vous sûr de vouloir remplacer le visuel ${type} actif ? Cette action sera enregistrée dans le journal d'audit.`)
    if (!confirmed) {
      target.value = ''
      return
    }
  }

  const file = target.files[0]
  const formData = new FormData()
  formData.append('file', file)

  loading.value = true
  successMsg.value = null
  errorMsg.value = null

  try {
    const res = await $fetch<any>(`/api/settings/assets/${type}`, {
      method: 'POST',
      body: formData,
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      await fetchSettings()
      successMsg.value = `Le visuel ${type} a été téléversé et activé avec succès.`
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message || 'Erreur lors du téléversement du fichier'
  } finally {
    loading.value = false
    target.value = ''
  }
}

const handleRemoveAsset = async (type: 'logo' | 'signature' | 'stamp') => {
  if (!isSuperAdmin.value) {
    errorMsg.value = 'Seul un Super Administrateur est autorisé à retirer les visuels officiels.'
    return
  }

  const confirmed = confirm(`Êtes-vous sûr de vouloir retirer le visuel ${type} des paramètres actifs ? cette modification n'affectera pas les documents déjà finalisés.`)
  if (!confirmed) return

  loading.value = true
  successMsg.value = null
  errorMsg.value = null

  try {
    const res = await $fetch<any>(`/api/settings/assets/active?type=${type.toUpperCase()}`, {
      method: 'DELETE',
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success) {
      await fetchSettings()
      successMsg.value = `Le visuel ${type} a été retiré des paramètres actifs.`
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Erreur lors de la suppression'
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  loading.value = true
  successMsg.value = null
  errorMsg.value = null

  try {
    const res = await $fetch<any>('/api/settings/company', {
      method: 'PATCH',
      body: form,
      headers: useRequestHeaders(['cookie'])
    })
    if (res.success && res.data) {
      Object.assign(form, res.data)
      successMsg.value = 'Les préférences des documents ont été enregistrées.'
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message || 'Erreur lors de la sauvegarde'
  } finally {
    loading.value = false
  }
}
</script>
