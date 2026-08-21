<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      @keydown.esc="close"
    >
      <div
        class="w-full max-w-lg bg-panel border border-rose-500/30 rounded-panel shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        <!-- Modal Header -->
        <div class="px-5 py-4 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-control bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div class="truncate">
              <h3 class="text-sm font-bold text-main truncate">
                {{ modalTitle }}
              </h3>
              <p class="text-xs text-rose-600 dark:text-rose-400 font-semibold truncate">
                Action irréversible sur {{ previewData?.totalSelected || count }} document(s)
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="close"
            class="p-1.5 bg-panel hover:bg-surface-hover text-muted-custom hover:text-main rounded-control transition-colors cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Content Body -->
        <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <!-- Classification Summary Card -->
          <div v-if="previewData" class="p-3.5 bg-panel-raised border border-custom rounded-card space-y-2">
            <div class="text-xs font-bold text-main mb-1">Résumé de la classification :</div>
            <div v-if="previewData.permanentDeleteAllowed > 0" class="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span><strong>{{ previewData.permanentDeleteAllowed }}</strong> brouillon(s) sera(seront) supprimé(s) définitivement.</span>
            </div>
            <div v-if="previewData.archiveOnly > 0" class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span><strong>{{ previewData.archiveOnly }}</strong> document(s) officiel(s) sera(seront) archivé(s).</span>
            </div>
            <div v-if="previewData.blocked > 0" class="text-xs text-muted-custom flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-muted-custom"></span>
              <span><strong>{{ previewData.blocked }}</strong> document(s) ne peut(peuvent) pas être traité(s).</span>
            </div>
          </div>

          <!-- Important Warning Note -->
          <p class="text-xs text-secondary-custom leading-relaxed bg-rose-500/5 border border-rose-500/10 p-3 rounded-card">
            Cette action appliquera le traitement sélectionné aux documents admissibles. Les suppressions définitives ne pourront pas être annulées et seront consignées dans l’historique d’audit.
          </p>

          <!-- Mandatory Reason Input -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-main">
              Motif de l’action <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="reasonText"
              type="text"
              placeholder="ex: Nettoyage administratif de fin de mois (min 10 caractères)"
              class="w-full px-3.5 py-2.5 bg-panel-raised border border-custom focus:border-rose-500 text-main placeholder-muted-custom rounded-control text-xs outline-none transition-colors"
            />
            <p v-if="reasonText.trim().length > 0 && reasonText.trim().length < 10" class="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
              Le motif doit comporter au moins 10 caractères (actuellement {{ reasonText.trim().length }}/10).
            </p>
          </div>

          <!-- Password Re-authentication Input (if required) -->
          <div v-if="isReauthRequired" class="space-y-1.5 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-card">
            <label class="block text-xs font-bold text-amber-700 dark:text-amber-300">
              Mot de passe de confirmation (ré-authentification requise) <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="passwordInput"
              type="password"
              placeholder="Entrez votre mot de passe Super Admin"
              class="w-full px-3.5 py-2.5 bg-panel border border-amber-500/30 focus:border-amber-500 text-main placeholder-muted-custom rounded-control text-xs outline-none transition-colors"
            />
            <p class="text-[11px] text-amber-600 dark:text-amber-400">
              Une ré-authentification est nécessaire pour traiter plus de 20 documents ou des suppressions sensibles.
            </p>
          </div>

          <!-- Typed Confirmation Phrase Input -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-main">
              Veuillez saisir exactement <code class="px-1.5 py-0.5 bg-panel-raised text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-control text-[11px] font-mono select-all">{{ requiredPhrase }}</code> pour confirmer :
            </label>
            <input
              v-model="typedPhrase"
              type="text"
              :placeholder="requiredPhrase"
              class="w-full px-3.5 py-2.5 bg-panel-raised border border-custom focus:border-rose-500 text-main placeholder-muted-custom rounded-control text-xs font-mono outline-none transition-colors"
            />
          </div>
        </div>

        <!-- Modal Actions Footer -->
        <div class="px-5 py-3.5 bg-panel-raised border-t border-custom flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            @click="close"
            class="px-4 py-2 bg-panel hover:bg-surface-hover text-main rounded-control text-xs font-semibold border border-custom transition-colors cursor-pointer"
          >
            Annuler
          </button>

          <button
            type="button"
            :disabled="!canSubmit || loading"
            @click="confirm"
            class="px-4 py-2 rounded-control text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            :class="actionType === 'RESTORE' ? 'bg-brand hover:opacity-90 text-slate-950' : 'bg-rose-600 hover:bg-rose-700 text-white'"
          >
            <svg v-if="loading" class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ actionButtonText }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  show: boolean
  actionType: 'ARCHIVE' | 'DELETE_DRAFTS' | 'MIXED_CLEANUP' | 'RESTORE'
  count: number
  previewData?: {
    totalSelected: number
    permanentDeleteAllowed: number
    archiveOnly: number
    blocked: number
  } | null
  loading?: boolean
  documentLabel?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', payload: { reason: string; confirmationPhrase: string; password?: string }): void
}>()

const typedPhrase = ref('')
const reasonText = ref('')
const passwordInput = ref('')

const totalAffected = computed(() => props.previewData?.totalSelected || props.count)
const permanentDeleteCount = computed(() => props.previewData?.permanentDeleteAllowed || 0)

const isReauthRequired = computed(() => {
  return totalAffected.value > 20 || permanentDeleteCount.value > 5
})

const requiredPhrase = computed(() => {
  const num = totalAffected.value
  if (props.actionType === 'RESTORE') return `RESTAURER ${num} DOCUMENTS`
  if (props.actionType === 'ARCHIVE') return `ARCHIVER ${num} DOCUMENTS`
  if (props.actionType === 'DELETE_DRAFTS') return `SUPPRIMER ${num} DOCUMENTS`
  return `TRAITER ${num} DOCUMENTS`
})

const modalTitle = computed(() => {
  const label = props.documentLabel || 'documents'
  if (props.actionType === 'RESTORE') return `Confirmer la restauration de ${totalAffected.value} ${label}`
  if (props.actionType === 'ARCHIVE') return `Confirmer l’archivage de ${totalAffected.value} ${label}`
  if (props.actionType === 'DELETE_DRAFTS') return `Confirmer la suppression de ${totalAffected.value} ${label}`
  return `Confirmer le traitement de ${totalAffected.value} ${label}`
})

const actionButtonText = computed(() => {
  if (props.actionType === 'RESTORE') return `Restaurer ${totalAffected.value} document(s)`
  if (props.actionType === 'ARCHIVE') return `Archiver ${totalAffected.value} document(s)`
  if (props.actionType === 'DELETE_DRAFTS') return `Supprimer ${totalAffected.value} document(s)`
  return `Traiter ${totalAffected.value} document(s)`
})

const canSubmit = computed(() => {
  const phraseMatches = typedPhrase.value.trim() === requiredPhrase.value
  const validReason = reasonText.value.trim().length >= 10
  const validPassword = !isReauthRequired.value || passwordInput.value.length > 0
  return phraseMatches && validReason && validPassword
})

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      typedPhrase.value = ''
      reasonText.value = ''
      passwordInput.value = ''
    }
  }
)

const close = () => {
  emit('close')
}

const confirm = () => {
  if (!canSubmit.value) return
  emit('confirm', {
    reason: reasonText.value.trim(),
    confirmationPhrase: typedPhrase.value.trim(),
    password: passwordInput.value || undefined
  })
}
</script>
