<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/rh/employes" class="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 mb-2">
          ← Retour à l’annuaire
        </NuxtLink>
        <h1 class="text-2xl font-bold text-slate-100 tracking-tight">Nouveau collaborateur</h1>
        <p class="text-xs text-slate-400 mt-1">Création d’une nouvelle fiche employé RH</p>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="formError" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300">
      {{ formError }}
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-8">
      <!-- Section 1: Identité Personnelle -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Identité Personnelle</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label class="block font-medium text-slate-300 mb-1">Prénom <span class="text-rose-400">*</span></label>
            <input
              v-model="form.firstName"
              type="text"
              required
              placeholder="Ex: Alae"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Nom <span class="text-rose-400">*</span></label>
            <input
              v-model="form.lastName"
              type="text"
              required
              placeholder="Ex: Bouhmala"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Genre</label>
            <select
              v-model="form.gender"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option :value="null">Non spécifié</option>
              <option value="MALE">Homme</option>
              <option value="FEMALE">Femme</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Date de naissance</label>
            <input
              v-model="form.birthDate"
              type="date"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Lieu de naissance</label>
            <input
              v-model="form.birthPlace"
              type="text"
              placeholder="Ex: Casablanca"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">CIN (Carte d'Identité)</label>
            <input
              v-model="form.cin"
              type="text"
              placeholder="Ex: AB123456"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      <!-- Section 2: Coordonnées & Contact -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>Coordonnées & Contact</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label class="block font-medium text-slate-300 mb-1">Téléphone principal <span class="text-rose-400">*</span></label>
            <input
              v-model="form.phonePrimary"
              type="text"
              required
              placeholder="Ex: 0661234567"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Téléphone secondaire</label>
            <input
              v-model="form.phoneSecondary"
              type="text"
              placeholder="Ex: 0522123456"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Email professionnel</label>
            <input
              v-model="form.professionalEmail"
              type="email"
              placeholder="Ex: a.bouhmala@atlasbites.ma"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Email personnel</label>
            <input
              v-model="form.personalEmail"
              type="email"
              placeholder="Ex: alae.perso@gmail.com"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div class="sm:col-span-2">
            <label class="block font-medium text-slate-300 mb-1">Adresse principale</label>
            <input
              v-model="form.addressLine1"
              type="text"
              placeholder="Ex: 123 Rue de la Liberté, Quartier Maarif"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Ville</label>
            <input
              v-model="form.city"
              type="text"
              placeholder="Ex: Casablanca"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Code postal</label>
            <input
              v-model="form.postalCode"
              type="text"
              placeholder="Ex: 20000"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: Contact d'urgence -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Contact d'urgence</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label class="block font-medium text-slate-300 mb-1">Nom du contact</label>
            <input
              v-model="form.emergencyContactName"
              type="text"
              placeholder="Ex: Karima Mantag"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Lien de parenté</label>
            <input
              v-model="form.emergencyContactRelationship"
              type="text"
              placeholder="Ex: Époux / Épouse / Parent"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Téléphone d'urgence</label>
            <input
              v-model="form.emergencyContactPhone"
              type="text"
              placeholder="Ex: 0661998877"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      <!-- Section 4: Emploi & Rémunération -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Emploi & Rémunération</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label class="block font-medium text-slate-300 mb-1">Date d'embauche <span class="text-rose-400">*</span></label>
            <input
              v-model="form.hireDate"
              type="date"
              required
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Statut d'emploi</label>
            <select
              v-model="form.employmentStatus"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ACTIVE">Actif</option>
              <option value="ONBOARDING">En intégration</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="DEPARTED">A quitté l’entreprise</option>
            </select>
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Salaire de base (MAD)</label>
            <input
              v-model="form.baseSalary"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 8500.00"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      <!-- Section 5: Informations Administratives & Bancaires -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
          <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Informations Administratives & Bancaires</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label class="block font-medium text-slate-300 mb-1">Numéro CNSS</label>
            <input
              v-model="form.cnssNumber"
              type="text"
              placeholder="Ex: 123456789"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Nom de la banque</label>
            <input
              v-model="form.bankName"
              type="text"
              placeholder="Ex: Attijariwafa Bank"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">RIB (24 chiffres)</label>
            <input
              v-model="form.rib"
              type="text"
              placeholder="Ex: 230780000000000000000123"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div class="sm:col-span-3">
            <label class="block font-medium text-slate-300 mb-1">Notes internes RH</label>
            <textarea
              v-model="form.internalNotes"
              rows="3"
              placeholder="Remarques ou informations internes réservées aux gestionnaires RH..."
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <NuxtLink
          to="/rh/employes"
          class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
        >
          Annuler
        </NuxtLink>

        <button
          type="submit"
          :disabled="submitting"
          class="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50 flex items-center gap-2"
        >
          <div v-if="submitting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-950"></div>
          <span>Créer la fiche employé</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useHrEmployees } from '~/composables/useHrEmployees'
import { useNotify } from '~/composables/useNotify'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const router = useRouter()
const notify = useNotify()
const { createEmployee } = useHrEmployees()

const submitting = ref(false)
const formError = ref<string | null>(null)

const form = reactive({
  firstName: '',
  lastName: '',
  gender: null,
  birthDate: '',
  birthPlace: '',
  nationality: 'Marocaine',
  cin: '',
  phonePrimary: '',
  phoneSecondary: '',
  personalEmail: '',
  professionalEmail: '',
  addressLine1: '',
  city: '',
  postalCode: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  hireDate: new Date().toISOString().split('T')[0],
  employmentStatus: 'ACTIVE',
  baseSalary: '',
  cnssNumber: '',
  bankName: '',
  rib: '',
  internalNotes: ''
})

async function handleSubmit() {
  submitting.value = true
  formError.value = null

  try {
    const res = await createEmployee({
      firstName: form.firstName,
      lastName: form.lastName,
      gender: form.gender,
      birthDate: form.birthDate || null,
      birthPlace: form.birthPlace || null,
      nationality: form.nationality || 'Marocaine',
      cin: form.cin || null,
      phonePrimary: form.phonePrimary,
      phoneSecondary: form.phoneSecondary || null,
      personalEmail: form.personalEmail || null,
      professionalEmail: form.professionalEmail || null,
      addressLine1: form.addressLine1 || null,
      city: form.city || null,
      postalCode: form.postalCode || null,
      emergencyContactName: form.emergencyContactName || null,
      emergencyContactRelationship: form.emergencyContactRelationship || null,
      emergencyContactPhone: form.emergencyContactPhone || null,
      hireDate: form.hireDate,
      employmentStatus: form.employmentStatus,
      baseSalary: form.baseSalary ? parseFloat(form.baseSalary) : 0,
      cnssNumber: form.cnssNumber || null,
      bankName: form.bankName || null,
      rib: form.rib || null,
      internalNotes: form.internalNotes || null
    })

    if (res.success && res.data) {
      notify.success('Nouveau collaborateur', 'Le collaborateur a été créé avec succès.')
      await router.push(`/rh/employes/${res.data.id}`)
    } else {
      formError.value = res.message || 'Échec de la création du collaborateur'
    }
  } catch (err: any) {
    formError.value = err.message || 'Une erreur inattendue est survenue'
  } finally {
    submitting.value = false
  }
}
</script>
