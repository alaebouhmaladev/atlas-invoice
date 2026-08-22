<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Breadcrumb & Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/devis" class="inline-flex items-center gap-1 text-xs text-brand-strong hover:text-brand font-bold mb-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Retour aux devis</span>
        </NuxtLink>
        <h2 class="text-2xl font-bold text-main tracking-tight">Nouveau devis</h2>
        <p class="text-xs text-muted-custom mt-1">Créez un nouveau devis de prestation traiteur pour un client.</p>
      </div>
    </div>

    <!-- Quote Form Component -->
    <QuoteForm
      :initial-client-id="(route.query.clientId as string)"
      :loading="loading"
      :general-error="error"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import QuoteForm from '~/components/quotes/QuoteForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()

const { createQuote, loading, error } = useQuotes()
const notify = useNotify()

async function handleFormSubmit(formData: Record<string, unknown>) {
  const result = await createQuote(formData)

  if (result.success && result.quote) {
    notify.success('Devis créé avec succès', `Le devis "${result.quote.number}" a été créé sous forme de brouillon.`)
    await navigateTo(`/devis/${result.quote.id}`)
  } else if (result.message) {
    notify.error('Impossible de créer le devis', result.message)
  }
}
</script>
