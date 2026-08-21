<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink to="/parametres" class="text-xs text-muted-custom hover:text-brand transition-colors">Paramètres</NuxtLink>
          <span class="text-muted-custom text-xs">/</span>
          <span class="text-xs text-brand font-bold">Entreprise</span>
        </div>
        <h1 class="text-2xl font-extrabold text-main tracking-tight">Informations de l'Entreprise</h1>
        <p class="text-xs text-muted-custom mt-0.5">Mettez à jour les coordonées officielles d'Atlas Bites SARL utilisées sur les devis et factures.</p>
      </div>

      <NuxtLink
        to="/parametres"
        class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main font-bold rounded-pill text-xs border border-custom transition-colors"
      >
        Retour
      </NuxtLink>
    </div>

    <!-- Alert Message -->
    <div v-if="successMsg" class="p-4 rounded-card bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
      <span>{{ successMsg }}</span>
    </div>

    <div v-if="errorMsg" class="p-4 rounded-card bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center justify-between">
      <span>{{ errorMsg }}</span>
    </div>

    <!-- Main Form Container -->
    <form @submit.prevent="handleSave" class="bg-panel border border-custom rounded-panel p-6 shadow-soft space-y-6">
      <!-- Section 1: Identité & Statut -->
      <div>
        <h2 class="text-sm font-bold text-main border-b border-custom pb-2 mb-4 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-brand"></span>
          <span>Identité Officielle</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Raison sociale *</label>
            <input
              v-model="form.legalName"
              type="text"
              required
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Nom commercial</label>
            <input
              v-model="form.tradeName"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Forme juridique</label>
            <input
              v-model="form.legalForm"
              type="text"
              placeholder="ex: SARL AU"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      <!-- Section 2: Identifiants Fiscaux -->
      <div>
        <h2 class="text-sm font-bold text-main border-b border-custom pb-2 mb-4 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-blue-500"></span>
          <span>Identifiants Fiscaux Marocains</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">ICE (15 chiffres)</label>
            <input
              v-model="form.ice"
              type="text"
              maxlength="15"
              placeholder="001234567890123"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Identifiant Fiscal (IF)</label>
            <input
              v-model="form.taxId"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Registre du Commerce (RC)</label>
            <input
              v-model="form.rc"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">N° CNSS</label>
            <input
              v-model="form.cnss"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">N° Patente</label>
            <input
              v-model="form.patent"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: Adresse & Contact -->
      <div>
        <h2 class="text-sm font-bold text-main border-b border-custom pb-2 mb-4 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Adresse & Contact</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Adresse principale</label>
            <input
              v-model="form.address"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Complément d'adresse</label>
            <input
              v-model="form.addressLine2"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Ville</label>
            <input
              v-model="form.city"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Téléphone principal</label>
            <input
              v-model="form.phone"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Email officiel</label>
            <input
              v-model="form.email"
              type="email"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      <!-- Section 4: Coordonnées Bancaires -->
      <div>
        <h2 class="text-sm font-bold text-main border-b border-custom pb-2 mb-4 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>Coordonnées Bancaires (Sur Factures)</span>
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Nom de la Banque</label>
            <input
              v-model="form.bankName"
              type="text"
              placeholder="ex: Attijariwafa Bank"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Titulaire du compte</label>
            <input
              v-model="form.accountHolder"
              type="text"
              class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">RIB (24 chiffres)</label>
            <input
              v-model="form.rib"
              type="text"
              placeholder="007 780 0001234567890123 45"
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
          <span>Enregistrer les modifications</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'

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
  legalForm: '',
  ice: '',
  taxId: '',
  rc: '',
  cnss: '',
  patent: '',
  address: '',
  addressLine2: '',
  city: '',
  phone: '',
  email: '',
  bankName: '',
  accountHolder: '',
  rib: '',
  quotePrefix: 'DEV',
  invoicePrefix: 'FAC',
  showSignatureOnPaidInvoice: true,
  showStampOnPaidInvoice: true,
  showLogoOnDocuments: true,
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
      successMsg.value = 'Les informations de l\'entreprise ont été mises à jour avec succès.'
    }
  } catch (err: any) {
    errorMsg.value = err.data?.message || err.message || 'Erreur lors de la sauvegarde des modifications'
  } finally {
    loading.value = false
  }
}
</script>
