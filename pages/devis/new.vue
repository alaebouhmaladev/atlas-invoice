<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Breadcrumb & Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/devis" class="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold mb-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Retour aux devis</span>
        </NuxtLink>
        <h2 class="text-2xl font-bold text-slate-100 tracking-tight">Nouveau devis</h2>
        <p class="text-xs text-slate-400 mt-1">Créez un nouveau devis de prestation traiteur pour un client.</p>
      </div>
    </div>

    <!-- Quote Form Component -->
    <QuoteForm
      :loading="loading"
      :general-error="error"
      @submit="handleFormSubmit"
    />

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

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { createQuote, loading, error } = useQuotes()

// Toast states
const showToast = ref(false)
const toastTitle = ref('')
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

async function handleFormSubmit(formData: Record<string, unknown>) {
  const result = await createQuote(formData)

  if (result.success && result.quote) {
    triggerToast('Devis créé', `Le devis "${result.quote.number}" a été créé sous forme de brouillon.`)
    await navigateTo(`/devis/${result.quote.id}`)
  }
}

function triggerToast(title: string, message: string, type: 'success' | 'error' = 'success') {
  toastTitle.value = title
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}
</script>
