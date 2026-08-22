<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Breadcrumb & Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink to="/clients" class="inline-flex items-center gap-1 text-xs text-brand-strong hover:text-brand font-bold mb-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Retour aux clients</span>
        </NuxtLink>
        <h2 class="text-2xl font-bold text-main tracking-tight">Nouveau client</h2>
        <p class="text-xs text-muted-custom mt-1">Créez une nouvelle fiche client entreprise ou particulier.</p>
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
      <div v-if="potentialDuplicates.length > 0" class="mt-3 space-y-2 border-t border-custom pt-3">
        <p class="text-xs font-bold text-main">Clients similaires trouvés :</p>
        <div
          v-for="dup in potentialDuplicates"
          :key="dup.id"
          class="p-2.5 rounded-control bg-panel-raised border border-custom text-xs flex items-center justify-between"
        >
          <div>
            <span class="font-bold text-main block">{{ dup.displayName }}</span>
            <span class="text-xs text-brand-strong font-bold block">{{ dup.matchReason }}</span>
          </div>
          <NuxtLink :to="`/clients/${dup.id}`" target="_blank" class="text-xs text-muted-custom hover:text-main underline font-semibold">
            Voir la fiche
          </NuxtLink>
        </div>
      </div>
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
