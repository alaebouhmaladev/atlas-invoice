<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink
        :to="`/factures/${route.params.id}`"
        class="p-2 text-muted-custom hover:text-main bg-panel-raised border border-custom rounded-control transition-colors"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </NuxtLink>
      <div>
        <h2 class="text-2xl font-bold text-main tracking-tight">Modifier le Brouillon de Facture</h2>
        <p class="text-xs text-muted-custom">Facture non finalisée.</p>
      </div>
    </div>

    <div
      v-if="error"
      class="p-4 rounded-card bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center justify-between font-bold"
    >
      <span>{{ error }}</span>
    </div>

    <div v-if="loading && !invoice" class="p-12 text-center text-muted-custom">
      <svg class="animate-spin h-8 w-8 text-brand mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs font-semibold">Chargement du brouillon...</p>
    </div>

    <InvoiceForm
      v-else-if="invoice"
      :invoice="invoice"
      :loading="loading"
      :is-edit="true"
      :error="error"
      @submit="handleUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInvoices } from '~/composables/useInvoices'
import InvoiceForm from '~/components/invoices/InvoiceForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { loading, error, fetchInvoice, updateInvoice } = useInvoices()

const invoice = ref<any>(null)

onMounted(async () => {
  const id = route.params.id as string
  try {
    const inv = await fetchInvoice(id)
    invoice.value = inv

    if (inv && inv.status !== 'DRAFT') {
      router.push(`/factures/${id}`)
    }
  } catch (e) {
    // handled
  }
})

const handleUpdate = async (payload: any) => {
  try {
    const updated = await updateInvoice(route.params.id as string, payload)
    if (updated) {
      router.push(`/factures/${updated.id}`)
    }
  } catch (e) {
    // error ref
  }
}
</script>
