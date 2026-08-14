<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink
        to="/factures"
        class="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </NuxtLink>
      <div>
        <h2 class="text-2xl font-bold text-slate-100 tracking-tight">Nouvelle Facture Directe</h2>
        <p class="text-xs text-slate-400">Création d'une facture directe en mode brouillon.</p>
      </div>
    </div>

    <div
      v-if="error"
      class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between"
    >
      <span>{{ error }}</span>
    </div>

    <InvoiceForm :loading="loading" :error="error" @submit="handleCreate" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useInvoices } from '~/composables/useInvoices'
import InvoiceForm from '~/components/invoices/InvoiceForm.vue'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const router = useRouter()
const { loading, error, createInvoice } = useInvoices()

const handleCreate = async (payload: any) => {
  try {
    const created = await createInvoice(payload)
    if (created && created.id) {
      router.push(`/factures/${created.id}`)
    }
  } catch (e) {
    // handled by composable error ref
  }
}
</script>
