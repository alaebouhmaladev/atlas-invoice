<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <!-- Breadcrumb & Header -->
    <div class="flex items-center justify-between">
      <div>
        <NuxtLink :to="`/clients/${route.params.id}`" class="inline-flex items-center gap-1 text-xs text-brand-strong hover:text-brand font-bold mb-1">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Retour à la fiche client</span>
        </NuxtLink>
        <h2 class="text-2xl font-bold text-main tracking-tight">Modifier le client</h2>
        <p class="text-xs text-muted-custom mt-1">Mettez à jour les informations du client {{ client?.displayName || '' }}.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pageLoading" class="p-12 text-center text-muted-custom">
      <svg class="animate-spin h-8 w-8 text-brand mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs font-semibold">Chargement des données du client...</p>
    </div>

    <!-- Client Not Found Error -->
    <div v-else-if="!client" class="bg-panel border border-custom rounded-panel p-8 text-center space-y-4 shadow-soft">
      <h3 class="text-base font-bold text-main">Client introuvable</h3>
      <NuxtLink to="/clients" class="inline-flex items-center gap-2 px-4 py-2 bg-panel-raised text-main border border-custom rounded-control text-xs font-bold">
        Retour à la liste
      </NuxtLink>
    </div>

    <!-- Client Form Component -->
    <template v-else>
      <ClientForm
        :initial-data="client"
        :is-edit="true"
        :loading="loading"
        :general-error="error"
        @submit="handleFormSubmit"
      />
    </template>

    <!-- Duplicate Warning Modal -->
    <ConfirmDialog
      :show="showDuplicateModal"
      title="Doublon potentiel détecté"
      message="Un autre client existant correspond aux informations saisies (nom, email ou téléphone). Souhaitez-vous quand même enregistrer la modification ?"
      confirm-text="Enregistrer quand même"
      cancel-text="Annuler et vérifier"
      :loading="loading"
      @confirm="confirmDuplicateUpdate"
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
import { ref, onMounted } from 'vue'
import ClientForm from '~/components/clients/ClientForm.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import type { ClientWithUser } from '~/composables/useClients'
import type { PotentialDuplicate } from '~/server/services/client.service'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const { fetchClient, updateClient, loading, error } = useClients()
const notify = useNotify()

const client = ref<ClientWithUser | null>(null)
const pageLoading = ref(true)

const pendingFormData = ref<Record<string, unknown> | null>(null)
const showDuplicateModal = ref(false)
const potentialDuplicates = ref<PotentialDuplicate[]>([])

async function loadClient() {
  const id = route.params.id as string
  if (id) {
    pageLoading.value = true
    client.value = await fetchClient(id)
    pageLoading.value = false
  }
}

async function handleFormSubmit(formData: Record<string, unknown>) {
  if (!client.value) return
  pendingFormData.value = formData
  const result = await updateClient(client.value.id, formData)

  if (result.duplicateWarning && result.potentialDuplicates) {
    potentialDuplicates.value = result.potentialDuplicates
    showDuplicateModal.value = true
    return
  }

  if (result.success && result.client) {
    notify.success('Client mis à jour avec succès', `Le client "${result.client.displayName}" a été mis à jour avec succès.`)
    await navigateTo(`/clients/${result.client.id}`)
  } else if (result.message) {
    notify.error('Impossible de modifier le client', result.message)
  }
}

async function confirmDuplicateUpdate() {
  if (!client.value || !pendingFormData.value) return
  showDuplicateModal.value = false

  const overrideData = {
    ...pendingFormData.value,
    confirmDuplicate: true
  }

  const result = await updateClient(client.value.id, overrideData)
  if (result.success && result.client) {
    notify.success('Client mis à jour avec succès', `Le client "${result.client.displayName}" a été mis à jour avec succès.`)
    await navigateTo(`/clients/${result.client.id}`)
  } else if (result.message) {
    notify.error('Impossible de modifier le client', result.message)
  }
}

onMounted(() => {
  loadClient()
})
</script>
