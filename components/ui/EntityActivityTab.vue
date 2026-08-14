<template>
  <div class="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
    <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
      <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
        <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Historique & Traçabilité du document
      </h3>

      <button
        @click="fetchEntityLogs"
        :disabled="loading"
        class="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
      >
        <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Actualiser
      </button>
    </div>

    <div v-if="loading && logs.length === 0" class="py-6 text-center text-xs text-slate-500">
      Chargement de l’historique...
    </div>

    <div v-else-if="logs.length === 0" class="py-6 text-center text-xs text-slate-500">
      Aucune activité enregistrée sur cette fiche.
    </div>

    <!-- Timeline list -->
    <div v-else class="relative border-l border-slate-800 ml-3 pl-4 space-y-4 text-xs">
      <div
        v-for="log in logs"
        :key="log.id"
        class="relative group"
      >
        <!-- Timeline node marker -->
        <span
          class="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border border-slate-900"
          :class="log.result === 'SUCCESS' ? 'bg-amber-400' : 'bg-rose-500'"
        ></span>

        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-slate-200">
              {{ formatActionLabel(log.action) }}
            </span>
            <span class="text-[10px] text-slate-500">
              {{ formatDate(log.createdAt) }}
            </span>
          </div>

          <p class="text-slate-400 mt-0.5 text-[11px]">
            Par <strong class="text-slate-300 font-semibold">{{ log.actorDisplayNameSnapshot || log.user?.name || 'Système' }}</strong>
            <span v-if="log.actorRoleSnapshot || log.user?.role" class="text-slate-500"> ({{ formatRole(log.actorRoleSnapshot || log.user?.role) }})</span>
          </p>

          <!-- Safe metadata description if available -->
          <div v-if="log.metadata && Object.keys(log.metadata).length > 0" class="mt-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/50 text-[10px] font-mono text-slate-400">
            <span v-for="(val, key) in log.metadata" :key="key" class="mr-3 inline-block">
              <span class="text-slate-500">{{ key }}:</span> {{ val }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  entityType: string
  entityId: string
}>()

const loading = ref(false)
const logs = ref<any[]>([])

async function fetchEntityLogs() {
  loading.value = true
  try {
    const res: any = await $fetch('/api/audit/entity', {
      query: { entityType: props.entityType, entityId: props.entityId }
    })
    if (res?.success) {
      logs.value = res.data.logs || []
    }
  } catch (err) {
    console.error('Failed to fetch entity audit logs:', err)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatRole(role?: string): string {
  if (role === 'SUPER_ADMIN') return 'Super Admin'
  if (role === 'ACCOUNTANT') return 'Comptable'
  if (role === 'COMMERCIAL') return 'Commercial'
  return role || 'Utilisateur'
}

function formatActionLabel(action: string): string {
  const map: Record<string, string> = {
    CLIENT_CREATED: 'Création du client',
    CLIENT_UPDATED: 'Modification de la fiche client',
    CLIENT_ARCHIVED: 'Archivage du client',
    QUOTE_CREATED: 'Création du devis',
    QUOTE_UPDATED: 'Modification du devis',
    QUOTE_STATUS_CHANGED: 'Changement de statut du devis',
    QUOTE_CONVERTED: 'Conversion du devis en facture',
    INVOICE_CREATED: 'Création de la facture',
    INVOICE_UPDATED: 'Modification de la facture',
    INVOICE_FINALIZED: 'Finalisation officielle de la facture',
    INVOICE_CANCELLED: 'Annulation de la facture',
    PAYMENT_CREATED: 'Enregistrement d’un paiement',
    PAYMENT_REVERSED: 'Annulation d’un paiement'
  }
  return map[action] || action
}

onMounted(() => {
  fetchEntityLogs()
})
</script>
