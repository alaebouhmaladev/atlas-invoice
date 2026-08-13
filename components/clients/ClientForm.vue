<template>
  <form @submit.prevent="handleSubmit" class="space-y-8">
    <!-- Server General Error -->
    <div
      v-if="generalError"
      class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3"
      role="alert"
    >
      <svg class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>{{ generalError }}</div>
    </div>

    <!-- SECTION 1: Type et identité -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5">
      <div class="border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">1</span>
          Type et Identité
        </h3>
        <p class="text-xs text-slate-400 mt-1">Sélectionnez le type de client et saisissez son nom légal.</p>
      </div>

      <!-- Type Switcher -->
      <div>
        <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Type de client *</label>
        <div class="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            @click="form.type = 'COMPANY'"
            class="py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            :class="form.type === 'COMPANY' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Entreprise / Sociétés</span>
          </button>

          <button
            type="button"
            @click="form.type = 'INDIVIDUAL'"
            class="py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            :class="form.type === 'INDIVIDUAL' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Particulier</span>
          </button>
        </div>
      </div>

      <!-- Company Name (Dynamic for COMPANY) -->
      <div v-if="form.type === 'COMPANY'">
        <label for="companyName" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Raison sociale *</label>
        <input
          id="companyName"
          v-model="form.companyName"
          type="text"
          required
          placeholder="ex: Atlas Catering SARL AU"
          class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          :class="{ 'border-rose-500': fieldErrors.companyName }"
        />
        <p v-if="fieldErrors.companyName" class="text-rose-400 text-[11px] mt-1">{{ fieldErrors.companyName }}</p>
      </div>

      <!-- First Name & Last Name (Dynamic for INDIVIDUAL) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="firstName" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Prénom *</label>
          <input
            id="firstName"
            v-model="form.firstName"
            type="text"
            required
            placeholder="ex: Mohamed"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            :class="{ 'border-rose-500': fieldErrors.firstName }"
          />
          <p v-if="fieldErrors.firstName" class="text-rose-400 text-[11px] mt-1">{{ fieldErrors.firstName }}</p>
        </div>

        <div>
          <label for="lastName" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nom *</label>
          <input
            id="lastName"
            v-model="form.lastName"
            type="text"
            required
            placeholder="ex: El Amrani"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            :class="{ 'border-rose-500': fieldErrors.lastName }"
          />
          <p v-if="fieldErrors.lastName" class="text-rose-400 text-[11px] mt-1">{{ fieldErrors.lastName }}</p>
        </div>
      </div>
    </div>

    <!-- SECTION 2: Informations fiscales (Entreprise) -->
    <div v-if="form.type === 'COMPANY'" class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5">
      <div class="border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">2</span>
          Informations Fiscales & Légales (Maroc)
        </h3>
        <p class="text-xs text-slate-400 mt-1">Identifiants obligatoires pour la conformité de facturation marocaine.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- ICE (15 Digits) -->
        <div>
          <label for="ice" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
            ICE (15 chiffres)
          </label>
          <input
            id="ice"
            v-model="form.ice"
            type="text"
            maxlength="15"
            placeholder="ex: 001234567890123"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            :class="{ 'border-rose-500': fieldErrors.ice }"
          />
          <p v-if="fieldErrors.ice" class="text-rose-400 text-[11px] mt-1">{{ fieldErrors.ice }}</p>
          <p v-else class="text-[11px] text-slate-500 mt-1">Identifiant Commun de l'Entreprise</p>
        </div>

        <!-- Identifiant Fiscal (IF) -->
        <div>
          <label for="taxId" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Identifiant Fiscal (IF)</label>
          <input
            id="taxId"
            v-model="form.taxId"
            type="text"
            placeholder="ex: 12345678"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <!-- Registre du Commerce (RC) -->
        <div>
          <label for="rc" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Registre du Commerce (RC)</label>
          <input
            id="rc"
            v-model="form.rc"
            type="text"
            placeholder="ex: 98765 Casablanca"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <!-- CNSS -->
        <div>
          <label for="cnss" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">N° CNSS</label>
          <input
            id="cnss"
            v-model="form.cnss"
            type="text"
            placeholder="ex: 1234567"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <!-- Patente -->
        <div>
          <label for="patent" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Patente</label>
          <input
            id="patent"
            v-model="form.patent"
            type="text"
            placeholder="ex: 34567890"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
      </div>
    </div>

    <!-- SECTION 3: Coordonnées -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5">
      <div class="border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">
            {{ form.type === 'COMPANY' ? 3 : 2 }}
          </span>
          Coordonnées & Adresse
        </h3>
        <p class="text-xs text-slate-400 mt-1">Adresse de facturation et numéros de contact direct.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="email" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Email principal</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="ex: contact@societe.ma"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            :class="{ 'border-rose-500': fieldErrors.email }"
          />
          <p v-if="fieldErrors.email" class="text-rose-400 text-[11px] mt-1">{{ fieldErrors.email }}</p>
        </div>

        <div>
          <label for="phone" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Téléphone principal</label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="ex: +212 522 12 34 56"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div>
          <label for="secondaryPhone" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Téléphone secondaire</label>
          <input
            id="secondaryPhone"
            v-model="form.secondaryPhone"
            type="tel"
            placeholder="ex: +212 661 98 76 54"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div>
          <label for="city" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Ville</label>
          <input
            id="city"
            v-model="form.city"
            type="text"
            placeholder="ex: Casablanca"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div class="sm:col-span-2">
          <label for="address" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Adresse ligne 1</label>
          <input
            id="address"
            v-model="form.address"
            type="text"
            placeholder="ex: 123 Boulevard Zerktouni, Etage 4"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div>
          <label for="addressLine2" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Complément d'adresse</label>
          <input
            id="addressLine2"
            v-model="form.addressLine2"
            type="text"
            placeholder="ex: Quartier Gautier"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div>
          <label for="postalCode" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Code postal</label>
          <input
            id="postalCode"
            v-model="form.postalCode"
            type="text"
            placeholder="ex: 20000"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
      </div>
    </div>

    <!-- SECTION 4: Personne de contact (Pour Entreprises) -->
    <div v-if="form.type === 'COMPANY'" class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5">
      <div class="border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">4</span>
          Personne de Contact
        </h3>
        <p class="text-xs text-slate-400 mt-1">Interlocuteur privilégié pour les événements traiteur et devis.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="contactName" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Nom du contact</label>
          <input
            id="contactName"
            v-model="form.contactName"
            type="text"
            placeholder="ex: Mme. Laila Bennani"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div>
          <label for="contactPosition" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Fonction / Poste</label>
          <input
            id="contactPosition"
            v-model="form.contactPosition"
            type="text"
            placeholder="ex: Responsable Événementiel"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div>
          <label for="contactEmail" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Email du contact</label>
          <input
            id="contactEmail"
            v-model="form.contactEmail"
            type="email"
            placeholder="ex: l.bennani@societe.ma"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div>
          <label for="contactPhone" class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Téléphone du contact</label>
          <input
            id="contactPhone"
            v-model="form.contactPhone"
            type="tel"
            placeholder="ex: +212 661 11 22 33"
            class="w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
      </div>
    </div>

    <!-- SECTION 5: Notes internes -->
    <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-5">
      <div class="border-b border-slate-800 pb-3">
        <h3 class="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">
            {{ form.type === 'COMPANY' ? 5 : 3 }}
          </span>
          Notes Internes
        </h3>
        <p class="text-xs text-slate-400 mt-1">Préférences alimentaires, spécificités traiteur, réductions accordées.</p>
      </div>

      <div>
        <label for="notes" class="sr-only">Notes internes</label>
        <textarea
          id="notes"
          v-model="form.notes"
          rows="4"
          placeholder="Indiquez ici toute information utile pour l'équipe commercial/comptabilité..."
          class="w-full px-4 py-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-y"
        ></textarea>
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex items-center justify-end gap-4 pt-4">
      <NuxtLink
        to="/clients"
        class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 transition-colors"
      >
        Annuler
      </NuxtLink>

      <button
        type="submit"
        :disabled="loading"
        class="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
      >
        <svg v-if="loading" class="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>{{ isEdit ? 'Mettre à jour le client' : 'Enregistrer le client' }}</span>
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import type { ClientType } from '@prisma/client'
import type { ClientWithUser } from '~/composables/useClients'

const props = defineProps<{
  initialData?: ClientWithUser
  isEdit?: boolean
  loading?: boolean
  generalError?: string | null
}>()

const emit = defineEmits(['submit'])

const form = reactive({
  type: (props.initialData?.type || 'COMPANY') as ClientType,
  companyName: props.initialData?.companyName || '',
  firstName: props.initialData?.firstName || '',
  lastName: props.initialData?.lastName || '',
  ice: props.initialData?.ice || '',
  taxId: props.initialData?.taxId || '',
  rc: props.initialData?.rc || '',
  cnss: props.initialData?.cnss || '',
  patent: props.initialData?.patent || '',
  email: props.initialData?.email || '',
  phone: props.initialData?.phone || '',
  secondaryPhone: props.initialData?.secondaryPhone || '',
  address: props.initialData?.address || '',
  addressLine2: props.initialData?.addressLine2 || '',
  city: props.initialData?.city || 'Casablanca',
  postalCode: props.initialData?.postalCode || '',
  country: props.initialData?.country || 'Maroc',
  contactName: props.initialData?.contactName || '',
  contactPosition: props.initialData?.contactPosition || '',
  contactEmail: props.initialData?.contactEmail || '',
  contactPhone: props.initialData?.contactPhone || '',
  notes: props.initialData?.notes || ''
})

const fieldErrors = reactive<Record<string, string>>({})

function validateClientForm(): boolean {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key])
  let isValid = true

  if (form.type === 'COMPANY') {
    if (!form.companyName.trim()) {
      fieldErrors.companyName = 'La raison sociale est requise'
      isValid = false
    }
  } else {
    if (!form.firstName.trim()) {
      fieldErrors.firstName = 'Le prénom est requis'
      isValid = false
    }
    if (!form.lastName.trim()) {
      fieldErrors.lastName = 'Le nom est requis'
      isValid = false
    }
  }

  if (form.ice && form.ice.trim()) {
    const cleanedIce = form.ice.replace(/\s+/g, '')
    if (!/^\d{15}$/.test(cleanedIce)) {
      fieldErrors.ice = "L'ICE doit comporter exactement 15 chiffres"
      isValid = false
    }
  }

  if (form.email && form.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      fieldErrors.email = "Format d'adresse email invalide"
      isValid = false
    }
  }

  return isValid
}

function handleSubmit() {
  if (!validateClientForm()) return
  emit('submit', { ...form })
}

watch(
  () => props.initialData,
  (newVal) => {
    if (newVal) {
      form.type = newVal.type
      form.companyName = newVal.companyName || ''
      form.firstName = newVal.firstName || ''
      form.lastName = newVal.lastName || ''
      form.ice = newVal.ice || ''
      form.taxId = newVal.taxId || ''
      form.rc = newVal.rc || ''
      form.cnss = newVal.cnss || ''
      form.patent = newVal.patent || ''
      form.email = newVal.email || ''
      form.phone = newVal.phone || ''
      form.secondaryPhone = newVal.secondaryPhone || ''
      form.address = newVal.address || ''
      form.addressLine2 = newVal.addressLine2 || ''
      form.city = newVal.city || 'Casablanca'
      form.postalCode = newVal.postalCode || ''
      form.country = newVal.country || 'Maroc'
      form.contactName = newVal.contactName || ''
      form.contactPosition = newVal.contactPosition || ''
      form.contactEmail = newVal.contactEmail || ''
      form.contactPhone = newVal.contactPhone || ''
      form.notes = newVal.notes || ''
    }
  },
  { immediate: true }
)
</script>
