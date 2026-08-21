<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink :to="`/rh/employes/${route.params.id}`" class="text-xs text-brand-strong hover:underline font-semibold flex items-center gap-1 mb-2">
          ← Annuler et revenir à la fiche
        </NuxtLink>
        <h1 class="text-2xl font-extrabold text-main tracking-tight">Modifier le collaborateur</h1>
        <p class="text-xs text-muted-custom mt-1">Mise à jour des informations administratives et coordonnées RH</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
    </div>

    <!-- Error Alert -->
    <div v-if="formError" class="p-4 bg-rose-500/10 border border-rose-500/30 rounded-panel text-xs text-rose-600 dark:text-rose-400">
      {{ formError }}
    </div>

    <form v-if="!loading && currentEmployee" @submit.prevent="handleSubmit" class="space-y-8">
      <!-- Section 1: Identité Personnelle -->
      <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
        <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2 border-b border-custom pb-3">
          <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Identité Personnelle</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label class="block font-semibold text-muted-custom mb-1">Prénom <span class="text-rose-500">*</span></label>
            <input
              v-model="form.firstName"
              type="text"
              required
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Nom <span class="text-rose-500">*</span></label>
            <input
              v-model="form.lastName"
              type="text"
              required
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Genre</label>
            <select
              v-model="form.gender"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            >
              <option :value="null">Non spécifié</option>
              <option value="MALE">Homme</option>
              <option value="FEMALE">Femme</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Date de naissance</label>
            <input
              v-model="form.birthDate"
              type="date"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Lieu de naissance</label>
            <input
              v-model="form.birthPlace"
              type="text"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">CIN (Carte d'Identité)</label>
            <input
              v-model="form.cin"
              type="text"
              placeholder="Modifier uniquement si nécessaire"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main font-mono focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      <!-- Section 2: Coordonnées & Contact -->
      <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
        <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2 border-b border-custom pb-3">
          <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span>Coordonnées & Contact</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label class="block font-semibold text-muted-custom mb-1">Téléphone principal <span class="text-rose-500">*</span></label>
            <input
              v-model="form.phonePrimary"
              type="text"
              required
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main font-mono focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Téléphone secondaire</label>
            <input
              v-model="form.phoneSecondary"
              type="text"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main font-mono focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Email professionnel</label>
            <input
              v-model="form.professionalEmail"
              type="email"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Email personnel</label>
            <input
              v-model="form.personalEmail"
              type="email"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div class="sm:col-span-2">
            <label class="block font-semibold text-muted-custom mb-1">Adresse principale</label>
            <input
              v-model="form.addressLine1"
              type="text"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Ville</label>
            <input
              v-model="form.city"
              type="text"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Code postal</label>
            <input
              v-model="form.postalCode"
              type="text"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: Contact d'urgence -->
      <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
        <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2 border-b border-custom pb-3">
          <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Contact d'urgence</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label class="block font-semibold text-muted-custom mb-1">Nom du contact</label>
            <input
              v-model="form.emergencyContactName"
              type="text"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Lien de parenté</label>
            <input
              v-model="form.emergencyContactRelationship"
              type="text"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Téléphone d'urgence</label>
            <input
              v-model="form.emergencyContactPhone"
              type="text"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main font-mono focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      <!-- Section 4: Emploi & Rémunération -->
      <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
        <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2 border-b border-custom pb-3">
          <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>Emploi & Rémunération</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label class="block font-semibold text-muted-custom mb-1">Date d'embauche <span class="text-rose-500">*</span></label>
            <input
              v-model="form.hireDate"
              type="date"
              required
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Statut d'emploi</label>
            <select
              v-model="form.employmentStatus"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            >
              <option value="ACTIVE">Actif</option>
              <option value="ONBOARDING">En intégration</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="DEPARTED">A quitté l’entreprise</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Salaire de base (MAD)</label>
            <input
              v-model="form.baseSalary"
              type="number"
              step="0.01"
              min="0"
              placeholder="Laisser vide si inchangé"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main font-mono focus:outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      <!-- Section 5: Informations Administratives & Bancaires -->
      <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
        <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2 border-b border-custom pb-3">
          <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Informations Administratives & Bancaires</span>
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label class="block font-semibold text-muted-custom mb-1">Numéro CNSS</label>
            <input
              v-model="form.cnssNumber"
              type="text"
              placeholder="Laisser vide si inchangé"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main font-mono focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">Nom de la banque</label>
            <input
              v-model="form.bankName"
              type="text"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label class="block font-semibold text-muted-custom mb-1">RIB (24 chiffres)</label>
            <input
              v-model="form.rib"
              type="text"
              placeholder="Laisser vide si inchangé"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main font-mono focus:outline-none focus:border-brand"
            />
          </div>

          <div class="sm:col-span-3">
            <label class="block font-semibold text-muted-custom mb-1">Notes internes RH</label>
            <textarea
              v-model="form.internalNotes"
              rows="3"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-4">
        <NuxtLink
          :to="`/rh/employes/${route.params.id}`"
          class="px-5 py-2.5 bg-panel hover:bg-surface-hover text-secondary-custom text-xs font-semibold rounded-pill border border-custom transition-colors"
        >
          Annuler
        </NuxtLink>

        <button
          type="submit"
          :disabled="submitting"
          class="px-6 py-2.5 bg-brand text-on-brand hover:bg-brand-strong text-xs font-bold rounded-pill transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
        >
          <div v-if="submitting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-on-brand"></div>
          <span>Enregistrer les modifications</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHrEmployees } from '~/composables/useHrEmployees'
import { useNotify } from '~/composables/useNotify'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const notify = useNotify()
const { currentEmployee, loading, fetchEmployeeById, updateEmployee } = useHrEmployees()

const submitting = ref(false)
const formError = ref<string | null>(null)

const form = reactive({
  version: 1,
  firstName: '',
  lastName: '',
  gender: null as any,
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
  hireDate: '',
  employmentStatus: 'ACTIVE',
  baseSalary: '',
  cnssNumber: '',
  bankName: '',
  rib: '',
  internalNotes: ''
})

async function loadData() {
  const id = route.params.id as string
  if (!id) return

  const emp = await fetchEmployeeById(id)
  if (emp) {
    form.version = emp.version
    form.firstName = emp.firstName
    form.lastName = emp.lastName
    form.gender = emp.gender || null
    form.birthDate = emp.birthDate ? new Date(emp.birthDate).toISOString().split('T')[0] : ''
    form.birthPlace = emp.birthPlace || ''
    form.nationality = emp.nationality || 'Marocaine'
    form.cin = emp.cin || ''
    form.phonePrimary = emp.phonePrimary
    form.phoneSecondary = emp.phoneSecondary || ''
    form.personalEmail = emp.personalEmail || ''
    form.professionalEmail = emp.professionalEmail || ''
    form.addressLine1 = emp.addressLine1 || ''
    form.city = emp.city || ''
    form.postalCode = emp.postalCode || ''
    form.emergencyContactName = emp.emergencyContactName || ''
    form.emergencyContactRelationship = emp.emergencyContactRelationship || ''
    form.emergencyContactPhone = emp.emergencyContactPhone || ''
    form.hireDate = emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : ''
    form.employmentStatus = emp.employmentStatus
    form.baseSalary = emp.baseSalary ? String(emp.baseSalary) : ''
    form.cnssNumber = emp.cnssNumber || ''
    form.bankName = emp.bankName || ''
    form.rib = emp.rib || ''
    form.internalNotes = emp.internalNotes || ''
  }
}

async function handleSubmit() {
  const id = route.params.id as string
  submitting.value = true
  formError.value = null

  try {
    const updatePayload: any = {
      version: form.version,
      firstName: form.firstName,
      lastName: form.lastName,
      gender: form.gender,
      birthDate: form.birthDate || null,
      birthPlace: form.birthPlace || null,
      nationality: form.nationality || 'Marocaine',
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
      bankName: form.bankName || null,
      internalNotes: form.internalNotes || null
    }

    if (form.cin !== undefined && form.cin !== '') updatePayload.cin = form.cin
    if (form.cnssNumber !== undefined && form.cnssNumber !== '') updatePayload.cnssNumber = form.cnssNumber
    if (form.rib !== undefined && form.rib !== '') updatePayload.rib = form.rib
    if (form.baseSalary !== undefined && form.baseSalary !== '') updatePayload.baseSalary = parseFloat(form.baseSalary)

    const res = await updateEmployee(id, updatePayload)

    if (res.success) {
      notify.success('Fiche mise à jour', 'Employé mis à jour avec succès.')
      await router.push(`/rh/employes/${id}`)
    } else {
      formError.value = res.message || 'Échec de la mise à jour'
    }
  } catch (err: any) {
    formError.value = err.message || 'Une erreur inattendue est survenue'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
