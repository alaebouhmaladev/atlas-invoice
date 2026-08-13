<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Breadcrumb & Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink :to="`/devis/${route.params.id}`" class="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold mb-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Retour au devis</span>
        </NuxtLink>
        <h2 class="text-2xl font-bold text-slate-100 tracking-tight">Modifier le devis</h2>
        <p class="text-xs text-slate-400 mt-1">Mettez à jour les prestations et montants du devis {{ quote?.number || '' }}.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pageLoading" class="p-12 text-center text-slate-400">
      <svg class="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs">Chargement du devis...</p>
    </div>

    <!-- Devis Not Found or Immutable Error -->
    <div v-else-if="!quote" class="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
      <h3 class="text-base font-bold text-slate-100">Devis introuvable</h3>
      <NuxtLink to="/devis" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold">
        Retour à la liste
      </NuxtLink>
    </div>

    <div v-else-if="quote.status !== 'DRAFT'" class="bg-slate-900/60 border border-rose-500/30 rounded-2xl p-8 text-center space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-100">Devis non modifiable</h3>
      <p class="text-xs text-slate-400 max-w-md mx-auto">
        Seuls les devis en statut <strong>Brouillon</strong> peuvent être modifiés. Le statut actuel de ce devis est <strong>{{ quote.status }}</strong>.
      </p>
      <NuxtLink :to="`/devis/${quote.id}`" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold">
        Voir la fiche du devis
      </NuxtLink>
    </div>

    <!-- Quote Form Component -->
    <template v-else>
      <QuoteForm
        :initial-data="quote"
        :is-edit="true"
        :loading="loading"
        :general-error="error"
        @submit="handleFormSubmit"
      />
    </template>

    <!-- Notification Toast -->
    <NotificationToast
      :show="showToast"
      :title="toastTitle"
      :message="toastMessage"
      :type="toastType"
      @close="showToast = false"
    />
  </div>
</template>

<script setup lang="ts">
import QuoteForm from '~/components/quotes/QuoteForm.vue'
import NotificationToast from '~/components/ui/NotificationToast.vue'
import type { QuoteWithRelations } from '~/composables/useQuotes'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const { fetchQuote, updateQuote, loading, error } = useQuotes()

const quote = ref<QuoteWithRelations | null>(null)
const pageLoading = ref(true)

// Toast states
const showToast = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

async function loadQuote() {
  const id = route.params.id as string
  if (id) {
    pageLoading.value = true
    quote.value = await fetchQuote(id)
    pageLoading.value = false
  }
}

async function handleFormSubmit(formData: Record<string, unknown>) {
  if (!quote.value) return
  const result = await updateQuote(quote.value.id, formData)

  if (result.success && result.quote) {
    triggerToast('Devis mis à jour', `Le devis "${result.quote.number}" a été mis à jour avec succès.`)
    await navigateTo(`/devis/${result.quote.id}`)
  }
}

function triggerToast(title: string, message: string, type: 'success' | 'error' = 'success') {
  toastTitle.value = title
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

onMounted(() => {
  loadQuote()
})
</script>
