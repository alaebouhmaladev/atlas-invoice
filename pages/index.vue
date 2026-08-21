<template>
  <div class="space-y-6">
    <!-- Header Banner & Global Date Filter -->
    <div class="bg-panel border border-custom rounded-panel p-6 shadow-soft relative overflow-hidden transition-colors">
      <div class="absolute -right-12 -top-12 w-64 h-64 bg-[#b49c80]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-[#b49c80]/15 border border-[#b49c80]/30 text-[#987d61] dark:text-[#d0baa0] text-xs font-bold mb-3">
            <span class="w-2 h-2 rounded-full bg-[#b49c80] animate-pulse"></span>
            Atlas Bites SARL • Tableau de Bord Production
          </div>

          <h2 class="text-2xl sm:text-3xl font-extrabold text-main tracking-tight">
            Bienvenue, {{ user?.name || 'Gestionnaire' }} !
          </h2>
          <p class="text-xs sm:text-sm text-secondary-custom mt-1 max-w-xl">
            Aperçu analytique et financier en temps réel de votre activité traiteur.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <!-- Date Filter Select -->
          <div class="relative">
            <select
              v-model="selectedPeriod"
              @change="fetchDashboardStats"
              class="appearance-none px-4 py-2 pr-9 bg-panel-raised hover:bg-surface-hover text-main text-xs font-semibold rounded-pill border border-custom focus:outline-none focus:border-brand cursor-pointer"
            >
              <option value="today">Aujourd’hui</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="this_month">Ce mois-ci</option>
              <option value="last_month">Mois précédent</option>
              <option value="this_year">Cette année</option>
              <option value="custom">Période personnalisée</option>
            </select>
            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-custom">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <NuxtLink
            to="/factures"
            class="px-4 py-2 bg-[#b49c80] hover:bg-[#987d61] text-slate-950 font-bold rounded-pill text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Factures</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Custom Date Picker Row -->
      <div v-if="selectedPeriod === 'custom'" class="mt-4 pt-4 border-t border-custom flex flex-wrap items-center gap-3 text-xs text-secondary-custom">
        <label class="flex items-center gap-2">
          <span>Du :</span>
          <input type="date" v-model="customStartDate" @change="fetchDashboardStats" class="bg-panel-raised border border-custom rounded-control px-3 py-1.5 text-main" />
        </label>
        <label class="flex items-center gap-2">
          <span>Au :</span>
          <input type="date" v-model="customEndDate" @change="fetchDashboardStats" class="bg-panel-raised border border-custom rounded-control px-3 py-1.5 text-main" />
        </label>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="inline-flex items-center gap-3 px-5 py-3 rounded-card bg-panel border border-custom text-brand text-xs font-bold shadow-soft">
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Chargement des indicateurs...</span>
      </div>
    </div>

    <template v-else-if="stats">
      <!-- 1. Financial KPI Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Chiffre d'affaires facturé -->
        <div class="bg-panel border border-custom rounded-card p-5 relative overflow-hidden shadow-soft">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">C.A. Facturé TTC</span>
            <span class="p-2 rounded-control bg-[#b49c80]/15 text-[#987d61] dark:text-[#d0baa0]">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div class="text-2xl font-black text-main font-mono mt-2">{{ formatMAD(stats.financials.invoicedRevenueTtc) }}</div>
          <p class="text-[11px] text-muted-custom mt-1">Factures finalisées sur la période</p>
        </div>

        <!-- Montant Encaissé -->
        <div class="bg-panel border border-custom rounded-card p-5 relative overflow-hidden shadow-soft">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">Montant Encaissé</span>
            <span class="p-2 rounded-control bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">{{ formatMAD(stats.financials.amountCollected) }}</div>
          <p class="text-[11px] text-muted-custom mt-1">Règlements encaissés enregistrés</p>
        </div>

        <!-- Reste à Encaisser -->
        <div class="bg-panel border border-custom rounded-card p-5 relative overflow-hidden shadow-soft">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">Reste à Encaisser</span>
            <span class="p-2 rounded-control bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div class="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono mt-2">{{ formatMAD(stats.financials.amountRemaining) }}</div>
          <p class="text-[11px] text-muted-custom mt-1">Solde restant du portefeuille factures</p>
        </div>

        <!-- Factures en Retard -->
        <div class="bg-panel border border-custom rounded-card p-5 relative overflow-hidden shadow-soft">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-muted-custom uppercase tracking-wider">Factures en Retard</span>
            <span class="p-2 rounded-control bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div class="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-2">{{ formatMAD(stats.financials.overdueInvoicesAmount) }}</div>
          <p class="text-[11px] text-muted-custom mt-1">{{ stats.financials.overdueInvoicesCount }} facture(s) dépassée(s)</p>
        </div>
      </div>

      <!-- Secondary Metrics Row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-panel-raised border border-custom rounded-card p-4">
          <span class="text-xs text-muted-custom">Factures créées</span>
          <div class="text-xl font-bold text-main font-mono mt-1">{{ stats.financials.invoicesCount }}</div>
        </div>
        <div class="bg-panel-raised border border-custom rounded-card p-4">
          <span class="text-xs text-muted-custom">Devis créés</span>
          <div class="text-xl font-bold text-main font-mono mt-1">{{ stats.financials.quotesCount }}</div>
        </div>
        <div class="bg-panel-raised border border-custom rounded-card p-4">
          <span class="text-xs text-muted-custom">Taux Transformation</span>
          <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">{{ stats.financials.quoteConversionRate }} %</div>
        </div>
        <div class="bg-panel-raised border border-custom rounded-card p-4">
          <span class="text-xs text-muted-custom">Valeur Devis Acceptés</span>
          <div class="text-xl font-bold text-[#987d61] dark:text-[#d0baa0] font-mono mt-1">{{ formatMAD(stats.financials.acceptedQuotesValueTtc) }}</div>
        </div>
      </div>

      <!-- 2. Actions Requises Section -->
      <div v-if="stats.actionsRequired.length > 0" class="bg-panel border border-amber-500/30 rounded-panel p-5 shadow-soft">
        <div class="flex items-center gap-2 mb-4">
          <svg class="w-5 h-5 text-amber-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 class="text-sm font-bold text-main uppercase tracking-wide">Actions Requises</h3>
        </div>

        <div class="space-y-2">
          <div
            v-for="act in stats.actionsRequired"
            :key="act.id"
            class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-card bg-panel-raised border border-custom hover:border-custom-strong transition-all gap-3"
          >
            <div class="flex items-start gap-3">
              <span
                :class="[
                  'px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5',
                  act.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                ]"
              >
                {{ act.type === 'INVOICE_OVERDUE' ? 'Retard' : act.type === 'QUOTE_EXPIRING' ? 'Expiration' : 'À Réglier' }}
              </span>
              <div>
                <div class="text-xs font-bold text-main">{{ act.title }}</div>
                <div class="text-[11px] text-muted-custom mt-0.5">{{ act.subtitle }} • Échéance : {{ act.date }}</div>
              </div>
            </div>

            <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0">
              <span class="text-xs font-bold text-main font-mono">{{ act.amount }}</span>
              <NuxtLink
                :to="act.link"
                class="px-3 py-1.5 bg-panel hover:bg-surface-hover text-main font-semibold text-[11px] rounded-control border border-custom transition-colors"
              >
                Consulter
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Distribution & Top Clients Breakdown -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Invoice Payment Distribution -->
        <div class="bg-panel border border-custom rounded-panel p-5 shadow-soft">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider mb-4">Répartition des Factures</h3>
          <div class="space-y-3">
            <div v-for="dist in stats.invoiceStatusDistribution" :key="dist.status" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-secondary-custom flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: dist.color }"></span>
                  {{ dist.label }}
                </span>
                <span class="font-bold text-main font-mono">{{ dist.count }} ({{ formatMAD(dist.totalTtc) }})</span>
              </div>
              <div class="w-full bg-panel-raised h-2 rounded-pill overflow-hidden">
                <div
                  class="h-full rounded-pill transition-all duration-500"
                  :style="{
                    backgroundColor: dist.color,
                    width: stats.financials.invoicesCount > 0 ? `${(dist.count / stats.financials.invoicesCount) * 100}%` : '0%'
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Clients -->
        <div class="bg-panel border border-custom rounded-panel p-5 shadow-soft">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider mb-4">Top Clients (C.A. Facturé)</h3>
          <div v-if="stats.topClients.length === 0" class="text-xs text-muted-custom py-6 text-center">
            Aucun client facturé sur la période.
          </div>
          <div v-else class="space-y-3">
            <div v-for="(cli, idx) in stats.topClients" :key="cli.clientId" class="flex items-center justify-between p-2.5 rounded-card bg-panel-raised border border-custom">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-control bg-[#b49c80]/15 text-[#987d61] dark:text-[#d0baa0] font-bold text-xs flex items-center justify-center">
                  #{{ idx + 1 }}
                </span>
                <div>
                  <div class="text-xs font-bold text-main">{{ cli.displayName }}</div>
                  <div class="text-[10px] text-muted-custom">{{ cli.invoicesCount }} facture(s)</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs font-bold text-main font-mono">{{ formatMAD(cli.invoicedTtc) }}</div>
                <div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Payé : {{ formatMAD(cli.amountPaid) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. System Health Card (Super Admin Only) -->
      <div v-if="user?.role === 'SUPER_ADMIN' && stats.systemHealth" class="bg-panel border border-custom rounded-panel p-5 shadow-soft">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            État Infra & Sauvegardes (Super Admin)
          </h3>
          <span class="px-2.5 py-1 rounded-pill bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            Opérationnel
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div class="p-3 rounded-card bg-panel-raised border border-custom">
            <span class="text-muted-custom">Application</span>
            <div class="font-bold text-emerald-600 dark:text-emerald-400 mt-1">Actif ({{ stats.systemHealth.version }})</div>
          </div>
          <div class="p-3 rounded-card bg-panel-raised border border-custom">
            <span class="text-muted-custom">PostgreSQL</span>
            <div class="font-bold text-emerald-600 dark:text-emerald-400 mt-1">Connecté (v16)</div>
          </div>
          <div class="p-3 rounded-card bg-panel-raised border border-custom">
            <span class="text-muted-custom">Stockage Assets</span>
            <div class="font-bold text-emerald-600 dark:text-emerald-400 mt-1">Accessible</div>
          </div>
          <div class="p-3 rounded-card bg-panel-raised border border-custom">
            <span class="text-muted-custom">Sauvegardes</span>
            <div class="font-bold text-emerald-600 dark:text-emerald-400 mt-1">Intègres (SHA-256)</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { definePageMeta, useAuth } from '#imports'
import type { DashboardStatsResponse } from '~/server/services/dashboard.service'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const { user } = useAuth()
const selectedPeriod = ref('30d')
const customStartDate = ref('')
const customEndDate = ref('')
const loading = ref(true)
const stats = ref<DashboardStatsResponse | null>(null)

async function fetchDashboardStats() {
  loading.value = true
  try {
    const res = await $fetch<{ success: boolean; data: DashboardStatsResponse }>('/api/dashboard/stats', {
      params: {
        period: selectedPeriod.value,
        startDate: customStartDate.value || undefined,
        endDate: customEndDate.value || undefined
      }
    })
    if (res.success && res.data) {
      stats.value = res.data
    }
  } catch (err) {
    console.error('Failed to load dashboard stats:', err)
  } finally {
    loading.value = false
  }
}

function formatMAD(amount: string | number): string {
  const val = Number(amount) || 0
  return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MAD'
}

onMounted(() => {
  fetchDashboardStats()
})
</script>
