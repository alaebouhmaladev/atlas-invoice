<template>
  <div class="space-y-8 max-w-5xl mx-auto">
    <!-- Navigation Back Link -->
    <div>
      <NuxtLink to="/rh/employes" class="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
        ← Retour à l’annuaire
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-3">
      <p class="text-xs font-bold text-rose-300">{{ error }}</p>
      <NuxtLink to="/rh/employes" class="inline-block text-xs text-amber-400 hover:underline">
        Revenir à l'annuaire des employés
      </NuxtLink>
    </div>

    <template v-else-if="currentEmployee">
      <!-- Profile Header Card -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <!-- Avatar / Photo -->
            <div class="relative group">
              <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-extrabold text-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                {{ getInitials(currentEmployee.displayName) }}
              </div>
            </div>

            <div class="space-y-1">
              <div class="flex items-center gap-3">
                <h1 class="text-xl font-bold text-slate-100 tracking-tight">{{ currentEmployee.displayName }}</h1>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold" :class="getStatusBadgeClass(currentEmployee.employmentStatus)">
                  {{ getStatusLabel(currentEmployee.employmentStatus) }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span class="font-mono font-semibold text-amber-400">{{ currentEmployee.employeeNumber }}</span>
                <span>• Engagé(e) le {{ formatDate(currentEmployee.hireDate) }}</span>
                <span v-if="currentEmployee.professionalEmail">• {{ currentEmployee.professionalEmail }}</span>
              </div>
            </div>
          </div>

          <!-- Header Action Buttons -->
          <div class="flex flex-wrap items-center gap-3">
            <NuxtLink
              :to="`/rh/employes/${currentEmployee.id}/modifier`"
              class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-700 flex items-center gap-2"
            >
              <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Modifier</span>
            </NuxtLink>

            <button
              v-if="currentEmployee.employmentStatus !== 'ARCHIVED'"
              @click="openArchiveModal"
              class="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2m-14 0v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>Archiver</span>
            </button>

            <button
              v-else
              @click="openRestoreModal"
              class="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Restaurer</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Roadmap Notice Box -->
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
        <div class="p-2 bg-amber-500/20 rounded-xl text-amber-400 shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-xs space-y-1">
          <h4 class="font-bold text-amber-300">Phase 2 RH Activée</h4>
          <p class="text-slate-300 leading-relaxed">
            Les affectations historiques, contrats de travail et le coffre-fort documentaire sécurisé sont désormais opérationnels.
          </p>
        </div>
      </div>

      <!-- Sections Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Identité Personnelle -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Identité Personnelle</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Prénom & Nom</span>
              <span class="text-slate-200 font-semibold">{{ currentEmployee.displayName }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Genre</span>
              <span class="text-slate-200 font-semibold">{{ getGenderLabel(currentEmployee.gender) }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Date de naissance</span>
              <span class="text-slate-200 font-semibold">{{ formatDate(currentEmployee.birthDate) }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Lieu de naissance</span>
              <span class="text-slate-200 font-semibold">{{ currentEmployee.birthPlace || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Nationalité</span>
              <span class="text-slate-200 font-semibold">{{ currentEmployee.nationality || 'Marocaine' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">CIN (Identité)</span>
              <span class="text-slate-200 font-mono font-semibold">{{ currentEmployee.cin || currentEmployee.cinMasked || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- Coordonnées & Contact -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Coordonnées & Adresse</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Téléphone principal</span>
              <span class="text-slate-200 font-mono font-semibold">{{ currentEmployee.phonePrimary }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Téléphone secondaire</span>
              <span class="text-slate-200 font-mono font-semibold">{{ currentEmployee.phoneSecondary || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Email professionnel</span>
              <span class="text-slate-200 font-semibold">{{ currentEmployee.professionalEmail || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Email personnel</span>
              <span class="text-slate-200 font-semibold">{{ currentEmployee.personalEmail || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Adresse</span>
              <span class="text-slate-200 font-semibold">{{ currentEmployee.addressLine1 || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Ville / Code postal</span>
              <span class="text-slate-200 font-semibold">{{ currentEmployee.city || '-' }} {{ currentEmployee.postalCode || '' }}</span>
            </div>
          </div>
        </div>

        <!-- Emploi & Rémunération -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Emploi & Rémunération</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Matricule</span>
              <span class="text-amber-400 font-mono font-bold">{{ currentEmployee.employeeNumber }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Date d'embauche</span>
              <span class="text-slate-200 font-semibold">{{ formatDate(currentEmployee.hireDate) }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Statut d'emploi</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="getStatusBadgeClass(currentEmployee.employmentStatus)">
                {{ getStatusLabel(currentEmployee.employmentStatus) }}
              </span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Salaire de base</span>
              <span class="text-emerald-400 font-bold font-mono">{{ currentEmployee.salaryFormatted }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Mode de paiement</span>
              <span class="text-slate-200 font-semibold">{{ formatPaymentMethod(currentEmployee.paymentMethod) }}</span>
            </div>
          </div>
        </div>

        <!-- Informations Administratives & Bancaires -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Informations Bancaires & CNSS</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Numéro CNSS</span>
              <span class="text-slate-200 font-mono font-semibold">{{ currentEmployee.cnssNumber || currentEmployee.cnssMasked || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Banque</span>
              <span class="text-slate-200 font-semibold">{{ currentEmployee.bankName || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">RIB (Compte Bancaire)</span>
              <span class="text-slate-200 font-mono font-semibold">{{ currentEmployee.rib || currentEmployee.ribMasked || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Notes internes RH</span>
              <span class="text-slate-300 italic">{{ currentEmployee.internalNotes || 'Aucune note' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Compte Utilisateur Lié -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span>Compte Utilisateur d’Accès</span>
          </h3>

          <button
            @click="openLinkUserModal"
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            {{ currentEmployee.linkedUser ? 'Gérer le compte lié' : 'Lier un compte utilisateur' }}
          </button>
        </div>

        <div v-if="currentEmployee.linkedUser" class="flex items-center justify-between text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div class="space-y-1">
            <p class="font-bold text-slate-200">{{ currentEmployee.linkedUser.name }}</p>
            <p class="text-slate-400 text-[11px]">{{ currentEmployee.linkedUser.email }}</p>
          </div>
          <div class="text-right">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
              Rôle : {{ currentEmployee.linkedUser.role }}
            </span>
          </div>
        </div>

        <div v-else class="text-xs text-slate-500 italic">
          Aucun compte utilisateur d’accès n’est lié à cette fiche employé.
        </div>
      </div>

      <!-- Historique d'activités RH -->
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-3">
          Historique des modifications RH
        </h3>

        <div v-if="!currentEmployee.activities || currentEmployee.activities.length === 0" class="text-center py-6 text-xs text-slate-500">
          Aucune activité enregistrée.
        </div>

        <div v-else class="space-y-3 text-xs">
          <div
            v-for="act in currentEmployee.activities"
            :key="act.id"
            class="flex items-start justify-between border-b border-slate-800/40 pb-2.5 last:border-0"
          >
            <div>
              <p class="font-semibold text-slate-200">{{ formatHrAction(act.action) }}</p>
              <p class="text-[11px] text-slate-400">
                Par <strong class="text-slate-300">{{ act.user?.name || 'Système' }}</strong>
              </p>
            </div>
            <span class="text-[11px] text-slate-500">{{ formatDate(act.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Confirm Dialog for Archive -->
      <div v-if="showArchiveDialog" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
          <h3 class="text-base font-bold text-rose-400">Archiver l’employé {{ currentEmployee.employeeNumber }}</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Pour confirmer l’archivage, saisissez exactement la formule suivante :
            <strong class="text-amber-400 block mt-1 font-mono">ARCHIVER {{ currentEmployee.employeeNumber }}</strong>
          </p>

          <div class="space-y-3">
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Motif d'archivage <span class="text-rose-400">*</span></label>
              <input
                v-model="archiveReasonInput"
                type="text"
                placeholder="Ex: Départ négocié, fin de contrat..."
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Confirmation d'archivage</label>
              <input
                v-model="archiveConfirmInput"
                type="text"
                :placeholder="`ARCHIVER ${currentEmployee.employeeNumber}`"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button @click="showArchiveDialog = false" class="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">Annuler</button>
            <button
              @click="executeArchive"
              :disabled="actionLoading"
              class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl disabled:opacity-50"
            >
              Confirmer l'archivage
            </button>
          </div>
        </div>
      </div>

      <!-- Confirm Dialog for Restore -->
      <div v-if="showRestoreDialog" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
          <h3 class="text-base font-bold text-emerald-400">Restaurer l’employé {{ currentEmployee.employeeNumber }}</h3>
          <p class="text-xs text-slate-300 leading-relaxed">
            Saisissez exactement la formule suivante pour confirmer la restauration :
            <strong class="text-emerald-400 block mt-1 font-mono">RESTAURER {{ currentEmployee.employeeNumber }}</strong>
          </p>

          <div>
            <input
              v-model="restoreConfirmInput"
              type="text"
              :placeholder="`RESTAURER ${currentEmployee.employeeNumber}`"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono"
            />
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button @click="showRestoreDialog = false" class="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">Annuler</button>
            <button
              @click="executeRestore"
              :disabled="actionLoading"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl disabled:opacity-50"
            >
              Confirmer la restauration
            </button>
          </div>
        </div>
      </div>

      <!-- Link User Account Modal -->
      <div v-if="showLinkModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
          <h3 class="text-base font-bold text-slate-100">Gestion du compte utilisateur lié</h3>

          <div v-if="currentEmployee.linkedUser" class="space-y-3">
            <p class="text-xs text-slate-300">
              Un compte est actuellement lié : <strong class="text-amber-400">{{ currentEmployee.linkedUser.email }}</strong>
            </p>
            <button
              @click="executeUnlinkUser"
              :disabled="actionLoading"
              class="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl"
            >
              Délier le compte utilisateur
            </button>
          </div>

          <div v-else class="space-y-3 text-xs">
            <label class="block font-medium text-slate-400 mb-1">Identifiant utilisateur (ID)</label>
            <input
              v-model="targetUserIdInput"
              type="text"
              placeholder="Ex: UUID du compte utilisateur"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
            <button
              @click="executeLinkUser"
              :disabled="actionLoading || !targetUserIdInput.trim()"
              class="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl disabled:opacity-50"
            >
              Lier ce compte
            </button>
          </div>

          <div class="flex justify-end pt-2">
            <button @click="showLinkModal = false" class="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">Fermer</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHrEmployees } from '~/composables/useHrEmployees'
import { useNotify } from '~/composables/useNotify'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const notify = useNotify()
const { currentEmployee, loading, error, fetchEmployeeById, archiveEmployee, restoreEmployee, linkUserAccount } = useHrEmployees()

const actionLoading = ref(false)
const showArchiveDialog = ref(false)
const archiveReasonInput = ref('')
const archiveConfirmInput = ref('')

const showRestoreDialog = ref(false)
const restoreConfirmInput = ref('')

const showLinkModal = ref(false)
const targetUserIdInput = ref('')

function openArchiveModal() {
  archiveReasonInput.value = ''
  archiveConfirmInput.value = ''
  showArchiveDialog.value = true
}

async function executeArchive() {
  if (!currentEmployee.value) return
  actionLoading.value = true
  try {
    const res = await archiveEmployee(currentEmployee.value.id, archiveReasonInput.value, archiveConfirmInput.value)
    if (res.success) {
      notify.success('Archivage', 'L’employé a été archivé avec succès.')
      showArchiveDialog.value = false
    } else {
      notify.error('Erreur d’archivage', res.message || 'Échec de l’archivage.')
    }
  } finally {
    actionLoading.value = false
  }
}

function openRestoreModal() {
  restoreConfirmInput.value = ''
  showRestoreDialog.value = true
}

async function executeRestore() {
  if (!currentEmployee.value) return
  actionLoading.value = true
  try {
    const res = await restoreEmployee(currentEmployee.value.id, restoreConfirmInput.value)
    if (res.success) {
      notify.success('Restauration', 'L’employé a été restauré avec succès.')
      showRestoreDialog.value = false
    } else {
      notify.error('Erreur de restauration', res.message || 'Échec de la restauration.')
    }
  } finally {
    actionLoading.value = false
  }
}

function openLinkUserModal() {
  targetUserIdInput.value = ''
  showLinkModal.value = true
}

async function executeLinkUser() {
  if (!currentEmployee.value || !targetUserIdInput.value.trim()) return
  actionLoading.value = true
  try {
    const res = await linkUserAccount(currentEmployee.value.id, targetUserIdInput.value.trim(), 'LINK')
    if (res.success) {
      notify.success('Compte lié', 'Le compte utilisateur a été lié avec succès.')
      showLinkModal.value = false
    } else {
      notify.error('Erreur de liage', res.message || 'Échec du liage.')
    }
  } finally {
    actionLoading.value = false
  }
}

async function executeUnlinkUser() {
  if (!currentEmployee.value) return
  actionLoading.value = true
  try {
    const res = await linkUserAccount(currentEmployee.value.id, null, 'UNLINK')
    if (res.success) {
      notify.success('Compte délié', 'Le compte utilisateur a été délié avec succès.')
      showLinkModal.value = false
    } else {
      notify.error('Erreur', res.message || 'Échec du déliage.')
    }
  } finally {
    actionLoading.value = false
  }
}

function getInitials(name: string): string {
  if (!name) return 'RH'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function formatDate(d?: string | Date | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR')
}

function getGenderLabel(g?: string | null): string {
  if (g === 'MALE') return 'Homme'
  if (g === 'FEMALE') return 'Femme'
  if (g === 'OTHER') return 'Autre'
  return '-'
}

function getStatusLabel(s: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Actif',
    ONBOARDING: 'En intégration',
    SUSPENDED: 'Suspendu',
    DEPARTED: 'A quitté',
    ARCHIVED: 'Archivé'
  }
  return map[s] || s
}

function getStatusBadgeClass(s: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    ONBOARDING: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    SUSPENDED: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    DEPARTED: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    ARCHIVED: 'bg-slate-800 text-slate-400 border border-slate-700'
  }
  return map[s] || 'bg-slate-800 text-slate-300'
}

function formatPaymentMethod(m?: string | null): string {
  const map: Record<string, string> = {
    BANK_TRANSFER: 'Virement bancaire',
    CHEQUE: 'Chèque',
    CASH: 'Espèces',
    CARD: 'Carte bancaire',
    OTHER: 'Autre'
  }
  return map[m || ''] || m || '-'
}

function formatHrAction(a: string): string {
  const map: Record<string, string> = {
    HR_EMPLOYEE_CREATED: 'Création d’un collaborateur',
    HR_EMPLOYEE_UPDATED: 'Modification de la fiche',
    HR_EMPLOYEE_ARCHIVED: 'Archivage',
    HR_EMPLOYEE_RESTORED: 'Restauration',
    HR_EMPLOYEE_USER_LINKED: 'Liage de compte utilisateur',
    HR_EMPLOYEE_USER_UNLINKED: 'Déliage de compte utilisateur',
    HR_SALARY_CHANGED: 'Modification de salaire',
    HR_SENSITIVE_DATA_VIEWED: 'Consultation de données sensibles'
  }
  return map[a] || a
}

onMounted(() => {
  const id = route.params.id as string
  if (id) fetchEmployeeById(id)
})
</script>
