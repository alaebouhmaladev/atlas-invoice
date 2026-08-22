<template>
  <div class="space-y-8 max-w-5xl mx-auto">
    <!-- Navigation Back Link -->
    <div>
      <NuxtLink to="/rh/employes" class="text-xs text-brand-strong hover:underline font-semibold flex items-center gap-1">
        ← Retour à l’annuaire
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6 bg-rose-500/10 border border-rose-500/30 rounded-panel text-center space-y-3">
      <p class="text-xs font-bold text-rose-600 dark:text-rose-400">{{ error }}</p>
      <NuxtLink to="/rh/employes" class="inline-block text-xs text-brand-strong hover:underline">
        Revenir à l'annuaire des employés
      </NuxtLink>
    </div>

    <template v-else-if="currentEmployee">
      <!-- Profile Header Card -->
      <div class="bg-panel border border-custom rounded-panel p-6 shadow-soft">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <!-- Avatar / Photo -->
            <div class="relative group">
              <div class="w-16 h-16 rounded-pill bg-brand-soft text-brand-strong font-extrabold text-xl flex items-center justify-center border border-brand-soft">
                {{ getInitials(currentEmployee.displayName) }}
              </div>
            </div>

            <div class="space-y-1">
              <div class="flex items-center gap-3">
                <h1 class="text-xl font-extrabold text-main tracking-tight">{{ currentEmployee.displayName }}</h1>
                <span class="px-2.5 py-0.5 rounded-pill text-xs font-bold" :class="getStatusBadgeClass(currentEmployee.employmentStatus)">
                  {{ getStatusLabel(currentEmployee.employmentStatus) }}
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-3 text-xs text-secondary-custom">
                <span class="font-mono font-bold text-brand-strong">{{ currentEmployee.employeeNumber }}</span>
                <span>• Engagé(e) le {{ formatDate(currentEmployee.hireDate) }}</span>
                <span v-if="currentEmployee.professionalEmail">• {{ currentEmployee.professionalEmail }}</span>
              </div>
            </div>
          </div>

          <!-- Header Action Buttons -->
          <div class="flex flex-wrap items-center gap-3">
            <NuxtLink
              :to="`/rh/employes/${currentEmployee.id}/modifier`"
              class="px-4 py-2 bg-panel hover:bg-surface-hover text-main text-xs font-bold rounded-pill transition-colors border border-custom flex items-center gap-2"
            >
              <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Modifier</span>
            </NuxtLink>

            <button
              v-if="currentEmployee.employmentStatus !== 'ARCHIVED'"
              @click="openArchiveModal"
              class="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-pill border border-rose-500/30 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 012-2h10a2 2 0 012 2m-14 0v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>Archiver</span>
            </button>

            <button
              v-else
              @click="openRestoreModal"
              class="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-pill border border-emerald-500/30 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Restaurer</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Notice Banner -->
      <div class="bg-brand-soft border border-brand-soft rounded-card p-4 flex items-start gap-3 shadow-soft">
        <div class="p-2 bg-brand-soft rounded-control text-brand-strong shrink-0">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-xs space-y-1">
          <h4 class="font-bold text-brand-strong">Module Ressources Humaines opérationnel</h4>
          <p class="text-secondary-custom leading-relaxed">
            La gestion des collaborateurs, de l’organisation, des contrats, des documents, du planning et du pointage est centralisée dans Atlas CRM.
          </p>
        </div>
      </div>

      <!-- Sections Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Identité Personnelle -->
        <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2 border-b border-custom pb-3">
            <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Identité Personnelle</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Prénom & Nom</span>
              <span class="text-main font-semibold">{{ currentEmployee.displayName }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Genre</span>
              <span class="text-main font-semibold">{{ getGenderLabel(currentEmployee.gender) }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Date de naissance</span>
              <span class="text-main font-semibold">{{ formatDate(currentEmployee.birthDate) }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Lieu de naissance</span>
              <span class="text-main font-semibold">{{ currentEmployee.birthPlace || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Nationalité</span>
              <span class="text-main font-semibold">{{ currentEmployee.nationality || 'Marocaine' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">CIN (Identité)</span>
              <span class="text-main font-mono font-semibold">{{ currentEmployee.cin || currentEmployee.cinMasked || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- Coordonnées & Contact -->
        <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2 border-b border-custom pb-3">
            <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Coordonnées & Adresse</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Téléphone principal</span>
              <span class="text-main font-mono font-semibold">{{ currentEmployee.phonePrimary }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Téléphone secondaire</span>
              <span class="text-main font-mono font-semibold">{{ currentEmployee.phoneSecondary || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Email professionnel</span>
              <span class="text-main font-semibold">{{ currentEmployee.professionalEmail || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Email personnel</span>
              <span class="text-main font-semibold">{{ currentEmployee.personalEmail || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Adresse</span>
              <span class="text-main font-semibold">{{ currentEmployee.addressLine1 || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Ville / Code postal</span>
              <span class="text-main font-semibold">{{ currentEmployee.city || '-' }} {{ currentEmployee.postalCode || '' }}</span>
            </div>
          </div>
        </div>

        <!-- Emploi & Rémunération -->
        <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2 border-b border-custom pb-3">
            <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Emploi & Rémunération</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Matricule</span>
              <span class="text-brand-strong font-mono font-bold">{{ currentEmployee.employeeNumber }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Date d'embauche</span>
              <span class="text-main font-semibold">{{ formatDate(currentEmployee.hireDate) }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Statut d'emploi</span>
              <span class="px-2 py-0.5 rounded-pill text-xs font-bold" :class="getStatusBadgeClass(currentEmployee.employmentStatus)">
                {{ getStatusLabel(currentEmployee.employmentStatus) }}
              </span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Salaire de base</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{{ currentEmployee.salaryFormatted }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Mode de paiement</span>
              <span class="text-main font-semibold">{{ formatPaymentMethod(currentEmployee.paymentMethod) }}</span>
            </div>
          </div>
        </div>

        <!-- Informations Administratives & Bancaires -->
        <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2 border-b border-custom pb-3">
            <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Informations Bancaires & CNSS</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Numéro CNSS</span>
              <span class="text-main font-mono font-semibold">{{ currentEmployee.cnssNumber || currentEmployee.cnssMasked || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Banque</span>
              <span class="text-main font-semibold">{{ currentEmployee.bankName || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">RIB (Compte Bancaire)</span>
              <span class="text-main font-mono font-semibold">{{ currentEmployee.rib || currentEmployee.ribMasked || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-custom/60">
              <span class="text-muted-custom">Notes internes RH</span>
              <span class="text-secondary-custom italic">{{ currentEmployee.internalNotes || 'Aucune note' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Compte Utilisateur Lié -->
      <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
        <div class="flex items-center justify-between border-b border-custom pb-3">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2">
            <svg class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span>Compte Utilisateur d’Accès</span>
          </h3>

          <button
            @click="openLinkUserModal"
            class="px-3 py-1.5 bg-panel hover:bg-surface-hover text-brand-strong text-xs font-bold rounded-pill border border-custom transition-colors cursor-pointer"
          >
            {{ currentEmployee.linkedUser ? 'Gérer le compte lié' : 'Lier un compte utilisateur' }}
          </button>
        </div>

        <div v-if="currentEmployee.linkedUser" class="flex items-center justify-between text-xs bg-panel-raised p-4 rounded-card border border-custom">
          <div class="space-y-1">
            <p class="font-bold text-main">{{ currentEmployee.linkedUser.name }}</p>
            <p class="text-muted-custom text-xs">{{ currentEmployee.linkedUser.email }}</p>
          </div>
          <div class="text-right">
            <span class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Rôle : {{ currentEmployee.linkedUser.role }}
            </span>
          </div>
        </div>

        <div v-else class="text-xs text-muted-custom italic">
          Aucun compte utilisateur d’accès n’est lié à cette fiche employé.
        </div>
      </div>

      <!-- Historique d'activités RH -->
      <div class="bg-panel border border-custom rounded-panel p-6 space-y-4 shadow-soft">
        <h3 class="text-xs font-bold text-main uppercase tracking-wider border-b border-custom pb-3">
          Historique des modifications RH
        </h3>

        <div v-if="!currentEmployee.activities || currentEmployee.activities.length === 0" class="text-center py-6 text-xs text-muted-custom">
          Aucune activité enregistrée.
        </div>

        <div v-else class="space-y-3 text-xs">
          <div
            v-for="act in currentEmployee.activities"
            :key="act.id"
            class="flex items-start justify-between border-b border-custom/60 pb-2.5 last:border-0"
          >
            <div>
              <p class="font-semibold text-main">{{ formatHrAuditAction(act.action) }}</p>
              <p class="text-xs text-muted-custom">
                Par <strong class="text-secondary-custom">{{ act.user?.name || 'Système' }}</strong>
              </p>
            </div>
            <span class="text-xs text-muted-custom">{{ formatDate(act.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Confirm Dialog for Archive -->
      <div v-if="showArchiveDialog" class="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-panel border border-custom rounded-panel max-w-md w-full p-6 space-y-4 shadow-2xl">
          <h3 class="text-base font-bold text-rose-600 dark:text-rose-400">Archiver l’employé {{ currentEmployee.employeeNumber }}</h3>
          <p class="text-xs text-secondary-custom leading-relaxed">
            Pour confirmer l’archivage, saisissez exactement la formule suivante :
            <strong class="text-brand-strong block mt-1 font-mono">ARCHIVER {{ currentEmployee.employeeNumber }}</strong>
          </p>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-muted-custom mb-1">Motif d'archivage <span class="text-rose-500">*</span></label>
              <input
                v-model="archiveReasonInput"
                type="text"
                placeholder="Ex: Départ négocié, fin de contrat..."
                class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs text-main focus:outline-none focus:border-brand"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-muted-custom mb-1">Confirmation d'archivage</label>
              <input
                v-model="archiveConfirmInput"
                type="text"
                :placeholder="`ARCHIVER ${currentEmployee.employeeNumber}`"
                class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs text-main font-mono uppercase focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button @click="showArchiveDialog = false" class="px-4 py-2 bg-panel text-secondary-custom text-xs rounded-control border border-custom cursor-pointer">Annuler</button>
            <button
              @click="executeArchive"
              :disabled="actionLoading"
              class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-control shadow-sm disabled:opacity-50 cursor-pointer"
            >
              Confirmer l'archivage
            </button>
          </div>
        </div>
      </div>

      <!-- Confirm Dialog for Restore -->
      <div v-if="showRestoreDialog" class="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-panel border border-custom rounded-panel max-w-md w-full p-6 space-y-4 shadow-2xl">
          <h3 class="text-base font-bold text-emerald-600 dark:text-emerald-400">Restaurer l’employé {{ currentEmployee.employeeNumber }}</h3>
          <p class="text-xs text-secondary-custom leading-relaxed">
            Saisissez exactement la formule suivante pour confirmer la restauration :
            <strong class="text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">RESTAURER {{ currentEmployee.employeeNumber }}</strong>
          </p>

          <div>
            <input
              v-model="restoreConfirmInput"
              type="text"
              :placeholder="`RESTAURER ${currentEmployee.employeeNumber}`"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs text-main font-mono uppercase focus:outline-none focus:border-brand"
            />
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button @click="showRestoreDialog = false" class="px-4 py-2 bg-panel text-secondary-custom text-xs rounded-control border border-custom cursor-pointer">Annuler</button>
            <button
              @click="executeRestore"
              :disabled="actionLoading"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-control shadow-sm disabled:opacity-50 cursor-pointer"
            >
              Confirmer la restauration
            </button>
          </div>
        </div>
      </div>

      <!-- Link User Account Modal -->
      <div v-if="showLinkModal" class="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-panel border border-custom rounded-panel max-w-md w-full p-6 space-y-4 shadow-2xl">
          <h3 class="text-base font-bold text-main">Gestion du compte utilisateur lié</h3>

          <div v-if="currentEmployee.linkedUser" class="space-y-3">
            <p class="text-xs text-secondary-custom">
              Un compte est actuellement lié : <strong class="text-brand-strong">{{ currentEmployee.linkedUser.email }}</strong>
            </p>
            <button
              @click="executeUnlinkUser"
              :disabled="actionLoading"
              class="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold rounded-control cursor-pointer"
            >
              Délier le compte utilisateur
            </button>
          </div>

          <div v-else class="space-y-3 text-xs">
            <label class="block font-medium text-muted-custom mb-1">Identifiant utilisateur (ID)</label>
            <input
              v-model="targetUserIdInput"
              type="text"
              placeholder="Ex: UUID du compte utilisateur"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-main focus:outline-none focus:border-brand"
            />
            <button
              @click="executeLinkUser"
              :disabled="actionLoading || !targetUserIdInput.trim()"
              class="w-full py-2.5 bg-brand text-on-brand hover:bg-brand-strong font-bold text-xs rounded-control shadow-sm disabled:opacity-50 cursor-pointer"
            >
              Lier ce compte
            </button>
          </div>

          <div class="flex justify-end pt-2">
            <button @click="showLinkModal = false" class="px-4 py-2 bg-panel text-secondary-custom text-xs rounded-control border border-custom cursor-pointer">Fermer</button>
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
import { formatHrAuditAction } from '~/utils/hrFormatters'

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

function openRestoreModal() {
  restoreConfirmInput.value = ''
  showRestoreDialog.value = true
}

function openLinkUserModal() {
  targetUserIdInput.value = ''
  showLinkModal.value = true
}

async function executeArchive() {
  if (!currentEmployee.value) return
  if (!archiveReasonInput.value.trim()) {
    notify.error('Erreur d’archivage', "Le motif d'archivage est obligatoire.")
    return
  }
  const expectedText = `ARCHIVER ${currentEmployee.value.employeeNumber}`
  if (archiveConfirmInput.value.trim().toUpperCase() !== expectedText) {
    notify.error('Confirmation requise', `Veuillez saisir exactement "${expectedText}".`)
    return
  }

  try {
    actionLoading.value = true
    await archiveEmployee(currentEmployee.value.id, archiveReasonInput.value.trim(), expectedText)
    notify.success('Archivage réussi', 'Fiche employé archivée avec succès.')
    showArchiveDialog.value = false
    await fetchEmployeeById(currentEmployee.value.id)
  } catch (err: any) {
    notify.error('Erreur d’archivage', err.data?.message || err.message || "Erreur lors de l'archivage")
  } finally {
    actionLoading.value = false
  }
}

async function executeRestore() {
  if (!currentEmployee.value) return
  const expectedText = `RESTAURER ${currentEmployee.value.employeeNumber}`
  if (restoreConfirmInput.value.trim().toUpperCase() !== expectedText) {
    notify.error('Confirmation requise', `Veuillez saisir exactement "${expectedText}".`)
    return
  }

  try {
    actionLoading.value = true
    await restoreEmployee(currentEmployee.value.id, expectedText)
    notify.success('Restauration réussie', 'Fiche employé restaurée avec succès.')
    showRestoreDialog.value = false
    await fetchEmployeeById(currentEmployee.value.id)
  } catch (err: any) {
    notify.error('Erreur de restauration', err.data?.message || err.message || 'Erreur lors de la restauration')
  } finally {
    actionLoading.value = false
  }
}

async function executeLinkUser() {
  if (!currentEmployee.value) return
  try {
    actionLoading.value = true
    await linkUserAccount(currentEmployee.value.id, targetUserIdInput.value.trim(), 'LINK')
    notify.success('Liage réussi', 'Compte utilisateur lié avec succès.')
    showLinkModal.value = false
    await fetchEmployeeById(currentEmployee.value.id)
  } catch (err: any) {
    notify.error('Erreur de liage', err.data?.message || err.message || 'Erreur lors du liage de compte')
  } finally {
    actionLoading.value = false
  }
}

async function executeUnlinkUser() {
  if (!currentEmployee.value) return
  try {
    actionLoading.value = true
    await linkUserAccount(currentEmployee.value.id, null, 'UNLINK')
    notify.success('Déliage réussi', 'Compte utilisateur délié avec succès.')
    showLinkModal.value = false
    await fetchEmployeeById(currentEmployee.value.id)
  } catch (err: any) {
    notify.error('Erreur de déliage', err.data?.message || err.message || 'Erreur lors du déliage de compte')
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

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('fr-FR')
}

function getGenderLabel(g?: string | null): string {
  const map: Record<string, string> = {
    MALE: 'Homme',
    FEMALE: 'Femme',
    OTHER: 'Autre'
  }
  return map[g || ''] || g || '-'
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
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    ONBOARDING: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    SUSPENDED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    DEPARTED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    ARCHIVED: 'bg-panel-raised text-muted-custom border border-custom'
  }
  return map[s] || 'bg-panel-raised text-secondary-custom'
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

onMounted(() => {
  const id = route.params.id as string
  if (id) fetchEmployeeById(id)
})
</script>
