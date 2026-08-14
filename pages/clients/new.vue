<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Breadcrumb & Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/clients" class="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold mb-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Retour aux clients</span>
        </NuxtLink>
        <h2 class="text-2xl font-bold text-slate-100 tracking-tight">Nouveau client</h2>
        <p class="text-xs text-slate-400 mt-1">Créez une nouvelle fiche client entreprise ou particulier.</p>
      </div>
    </div>

    <!-- Client Form Component -->
    <ClientForm
      :loading="loading"
      :general-error="error"
      @submit="handleFormSubmit"
    />

    <!-- Duplicate Warning Modal -->
    <ConfirmDialog
      :show="showDuplicateModal"
      title="Doublon potentiel détecté"
      message="Un ou plusieurs clients existants correspondent à vos informations (nom, email ou téléphone). Souhaitez-vous quand même créer ce client ?"
      confirm-text="Créer quand même"
      cancel-text="Annuler et vérifier"
      :loading="loading"
      @confirm="confirmDuplicateCreation"
      @cancel="showDuplicateModal = false"
    >
      <div v-if="potentialDuplicates.length > 0" class="mt-3 space-y-2 border-t border-slate-800 pt-3">
        <p class="text-xs font-semibold text-slate-300">Clients similaires trouvés :</p>
        <div
          v-for="dup in potentialDuplicates"
          :key="dup.id"
          class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
        >
          <div>
            <span class="font-bold text-slate-200 block">{{ dup.displayName }}</span>
            <span class="text-[11px] text-amber-400 block">{{ dup.matchReason }}</span>
          </div>
          <NuxtLink :to="`/clients/${dup.id}`" target="_blank" class="text-[11px] text-slate-400 hover:text-white underline">
            Voir la fiche
          </NuxtLink>
        </div>
      </div>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import ClientForm from '~/components/clients/ClientForm.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import type { PotentialDuplicate } from '~/server/services/client.service'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { createClient, loading, error } = useClients()
const notify = useNotify()

const pendingFormData = ref<Record<string, unknown> | null>(null)
const showDuplicateModal = ref(false)
const potentialDuplicates = ref<PotentialDuplicate[]>([])

async function handleFormSubmit(formData: Record<string, unknown>) {
  pendingFormData.value = formData
  const result = await createClient(formData)

  if (result.duplicateWarning && result.potentialDuplicates) {
    potentialDuplicates.value = result.potentialDuplicates
    showDuplicateModal.value = true
    return
  }

  if (result.success && result.client) {
    notify.success('Client créé avec succès', `Le client "${result.client.displayName}" a été créé avec succès.`)
    await navigateTo(`/clients/${result.client.id}`)
  } else if (result.message) {
    notify.error('Impossible de créer le client', result.message)
  }
}

async function confirmDuplicateCreation() {
  if (!pendingFormData.value) return
  showDuplicateModal.value = false

  const overrideData = {
    ...pendingFormData.value,
    confirmDuplicate: true
  }

  const result = await createClient(overrideData)
  if (result.success && result.client) {
    notify.success('Client créé avec succès', `Le client "${result.client.displayName}" a été créé avec succès.`)
    await navigateTo(`/clients/${result.client.id}`)
  } else if (result.message) {
    notify.error('Impossible de créer le client', result.message)
  }
}
</script>
