<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-extrabold text-main tracking-tight">Paramètres de Pointage & Bornes Tablette</h1>
      <p class="text-xs text-muted-custom mt-1">Configuration des politiques de pointage, tolérances et bornes enregistrées.</p>
    </div>

    <!-- Policy Configuration Form -->
    <div class="bg-panel border border-custom rounded-panel p-6 sm:p-8 space-y-6 shadow-soft">
      <h2 class="text-base font-bold text-main border-b border-custom pb-3">Politique de Pointage Par Défaut</h2>

      <form @submit.prevent="savePolicy" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1.5">Fuseau Horaire</label>
          <input
            v-model="policy.timezone"
            type="text"
            readonly
            class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-secondary-custom text-xs font-mono cursor-not-allowed"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1.5">Tolérance Entrée Anticipée (min)</label>
          <input
            v-model.number="policy.earlyClockInToleranceMinutes"
            type="number"
            required
            class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-main text-xs focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1.5">Tolérance Retard (min)</label>
          <input
            v-model.number="policy.lateArrivalToleranceMinutes"
            type="number"
            required
            class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-main text-xs focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1.5">Tolérance Départ Anticipé (min)</label>
          <input
            v-model.number="policy.earlyDepartureToleranceMinutes"
            type="number"
            required
            class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-main text-xs focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1.5">Durée Max Pause Autorisée (min)</label>
          <input
            v-model.number="policy.maxAllowedBreakMinutes"
            type="number"
            required
            class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-main text-xs focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1.5">Seuil Déclenchement H.Suppl (min)</label>
          <input
            v-model.number="policy.overtimeThresholdMinutes"
            type="number"
            required
            class="w-full px-4 py-2.5 bg-panel-raised border border-custom rounded-control text-main text-xs focus:outline-none focus:border-brand"
          />
        </div>

        <div class="sm:col-span-2 lg:col-span-3 flex justify-end">
          <button
            type="submit"
            :disabled="savingPolicy"
            class="px-5 py-2.5 bg-brand text-on-brand hover:bg-brand-strong font-bold rounded-pill text-xs shadow-sm transition-colors cursor-pointer"
          >
            Enregistrer la Politique RH
          </button>
        </div>
      </form>
    </div>

    <!-- Terminal Management Section -->
    <div class="bg-panel border border-custom rounded-panel p-6 sm:p-8 space-y-6 shadow-soft">
      <div class="flex items-center justify-between border-b border-custom pb-3">
        <h2 class="text-base font-bold text-main">Bornes de Pointage Enregistrées</h2>
        <button
          @click="openNewTerminalModal"
          class="px-3.5 py-1.5 bg-panel-raised hover:bg-surface-hover text-brand-strong font-bold rounded-pill text-xs border border-custom transition-colors cursor-pointer"
        >
          + Ajouter une Borne Tablette
        </button>
      </div>

      <div v-if="!terminals.length" class="text-center py-8 text-xs text-muted-custom">
        Aucune borne de pointage enregistrée.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          v-for="t in terminals"
          :key="t.id"
          class="p-4 bg-panel-raised border border-custom rounded-card flex items-center justify-between"
        >
          <div>
            <div class="text-xs font-bold text-main">{{ t.name }}</div>
            <div class="text-xs font-mono text-brand-strong font-bold">Code : {{ t.code }}</div>
            <div class="text-xs text-muted-custom mt-1">Site : {{ t.site.name }}</div>
          </div>

          <div class="text-right">
            <span :class="t.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'" class="px-2.5 py-1 text-xs font-bold rounded-pill border">
              {{ t.isActive ? 'Active' : 'Révoquée' }}
            </span>

            <div v-if="t.isActive" class="mt-2">
              <button
                @click="revokeTerminal(t.id)"
                class="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
              >
                Révoquer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotificationToast } from '~/composables/useNotify'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { showSuccess, showError } = useNotificationToast()

const policy = ref<any>({
  timezone: 'Africa/Casablanca',
  earlyClockInToleranceMinutes: 15,
  lateArrivalToleranceMinutes: 10,
  earlyDepartureToleranceMinutes: 10,
  maxAllowedBreakMinutes: 60,
  overtimeThresholdMinutes: 480
})
const savingPolicy = ref(false)
const terminals = ref<any[]>([])

async function loadData() {
  try {
    policy.value = await $fetch<any>('/api/rh/pointage/politiques')
    terminals.value = await $fetch<any[]>('/api/rh/pointage/terminal')
  } catch (err) {
    console.error('Failed to load settings:', err)
  }
}

async function savePolicy() {
  savingPolicy.value = true
  try {
    policy.value = await $fetch('/api/rh/pointage/politiques', {
      method: 'POST',
      body: policy.value
    })
    showSuccess('Politique de pointage enregistrée.')
  } catch (err: any) {
    showError(err.data?.message || err.message || 'Erreur d’enregistrement.')
  } finally {
    savingPolicy.value = false
  }
}

function openNewTerminalModal() {
  // Modal for registering terminal
}

async function revokeTerminal(id: string) {
  if (!confirm('Êtes-vous sûr de vouloir révoquer cette borne de pointage ?')) return
  try {
    await $fetch(`/api/rh/pointage/terminal/${id}/revoke`, {
      method: 'POST',
      body: { reason: 'Révocation manuelle administrateur' }
    })
    showSuccess('Borne révoquée avec succès.')
    loadData()
  } catch (err: any) {
    showError(err.data?.message || err.message || 'Erreur lors de la réactivation/révocation.')
  }
}

onMounted(() => {
  loadData()
})
</script>
