<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 bg-overlay backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="title || 'Aperçu du PDF'"
      @keydown.esc="close"
    >
      <div
        class="w-full h-full sm:h-[85vh] sm:max-w-5xl bg-panel border border-custom rounded-panel shadow-2xl flex flex-col overflow-hidden"
      >
        <!-- Modal Header Bar -->
        <div class="px-4 py-3 bg-panel-raised border-b border-custom flex items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-control bg-brand-soft border border-brand-soft text-brand-strong flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="truncate">
              <h3 class="text-xs font-bold text-main truncate">
                {{ title || 'Aperçu du PDF' }}
              </h3>
              <p class="text-xs text-muted-custom truncate">
                {{ documentNumber || 'Document commercial' }}
              </p>
            </div>
          </div>

          <!-- Actions Header Buttons -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="blobUrl"
              type="button"
              @click="openInNewTab"
              class="px-3 py-1.5 bg-panel hover:bg-surface-hover text-main rounded-control text-xs font-semibold border border-custom transition-colors hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
              title="Ouvrir dans un nouvel onglet"
              aria-label="Ouvrir dans un nouvel onglet"
            >
              <svg class="w-3.5 h-3.5 text-muted-custom" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Ouvrir dans un nouvel onglet</span>
            </button>

            <button
              v-if="blobUrl"
              type="button"
              @click="downloadPdf"
              class="px-3 py-1.5 bg-brand-soft hover:bg-brand-strong/20 text-brand-strong border border-brand-soft rounded-control text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Télécharger"
              aria-label="Télécharger le fichier PDF"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Télécharger</span>
            </button>

            <button
              type="button"
              @click="close"
              class="p-1.5 bg-panel hover:bg-surface-hover text-muted-custom hover:text-main rounded-control transition-colors cursor-pointer"
              title="Fermer"
              aria-label="Fermer la fenêtre d'aperçu"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Body Content -->
        <div class="flex-1 bg-workspace p-2 sm:p-4 relative overflow-hidden flex items-center justify-center">
          <!-- Loading State -->
          <div v-if="loading" class="text-center space-y-3 p-8">
            <svg class="animate-spin h-8 w-8 text-brand mx-auto" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-xs text-muted-custom font-semibold">Chargement du document...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="text-center space-y-3 p-8 max-w-sm">
            <div class="w-12 h-12 rounded-card bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 class="text-sm font-bold text-main">Impossible de charger le PDF</h4>
            <p class="text-xs text-muted-custom">{{ error }}</p>
            <button
              type="button"
              @click="loadPdf"
              class="px-4 py-2 bg-brand text-on-brand hover:bg-brand-strong font-bold rounded-pill text-xs transition-colors cursor-pointer"
            >
              Réessayer
            </button>
          </div>

          <!-- Embedded PDF Viewer -->
          <iframe
            v-else-if="blobUrl"
            :src="blobUrl"
            class="w-full h-full rounded-card border border-custom bg-white shadow-soft"
            title="Visionneuse PDF"
          >
            <p class="p-4 text-xs text-muted-custom text-center">
              Votre navigateur ne supporte pas la visionneuse PDF intégrée.
              <button @click="downloadPdf" class="text-brand-strong underline font-bold ml-1">Cliquez ici pour télécharger le PDF</button>.
            </p>
          </iframe>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps<{
  show: boolean
  pdfUrl: string
  title?: string
  documentNumber?: string
  filename?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const blobUrl = ref<string | null>(null)

const cleanupBlobUrl = () => {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = null
  }
}

const loadPdf = async () => {
  if (!props.pdfUrl) return
  cleanupBlobUrl()
  loading.value = true
  error.value = null

  try {
    const rawData = await $fetch<any>(props.pdfUrl, {
      responseType: 'blob',
      headers: useRequestHeaders(['cookie'])
    })
    if (!rawData) {
      throw new Error('Le fichier PDF généré est vide.')
    }
    const pdfBlob = new Blob([rawData], { type: 'application/pdf' })
    if (pdfBlob.size === 0) {
      throw new Error('Le fichier PDF généré est vide.')
    }
    blobUrl.value = URL.createObjectURL(pdfBlob)
  } catch (err: any) {
    error.value = err.data?.message || err.message || 'Erreur lors de la récupération du PDF.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      loadPdf()
    } else {
      cleanupBlobUrl()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  cleanupBlobUrl()
})

const close = () => {
  cleanupBlobUrl()
  emit('close')
}

const openInNewTab = () => {
  if (blobUrl.value) {
    window.open(blobUrl.value, '_blank')
  }
}

const downloadPdf = () => {
  if (!blobUrl.value) return
  const a = document.createElement('a')
  a.href = blobUrl.value
  a.download = props.filename || `${props.documentNumber || 'document'}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>
