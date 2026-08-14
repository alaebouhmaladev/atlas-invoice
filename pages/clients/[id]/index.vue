<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Top Navigation Bar -->
    <div class="flex items-center justify-between">
      <NuxtLink to="/clients" class="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Retour au répertoire des clients</span>
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loadingClient && !client" class="p-16 text-center text-slate-400">
      <svg class="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-xs">Chargement de la fiche client Client 360°...</p>
    </div>

    <!-- Client Not Found Error -->
    <div v-else-if="!client" class="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
      <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-base font-bold text-slate-100">Client introuvable</h3>
      <p class="text-xs text-slate-400">Ce client n'existe pas ou a été supprimé.</p>
      <NuxtLink to="/clients" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold">
        Retour aux clients
      </NuxtLink>
    </div>

    <!-- Client 360° Main Content -->
    <template v-else>
      <!-- HEADER CARD -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div class="space-y-2">
            <div class="flex items-center gap-3 flex-wrap">
              <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">
                {{ client.displayName }}
              </h2>
              <ClientTypeBadge :type="client.type" />
              <ClientStatusBadge :is-archived="client.isArchived" />
            </div>

            <p v-if="client.type === 'COMPANY' && client.companyName" class="text-xs text-slate-400">
              Raison sociale : <strong class="text-slate-200">{{ client.companyName }}</strong>
              <span v-if="client.ice" class="ml-3 text-slate-500">ICE : {{ client.ice }}</span>
            </p>
            <p v-else-if="client.firstName || client.lastName" class="text-xs text-slate-400">
              Nom complet : <strong class="text-slate-200">{{ client.firstName }} {{ client.lastName }}</strong>
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-2 flex-wrap">
            <NuxtLink
              :to="`/devis/new?clientId=${client.id}`"
              class="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Créer un devis</span>
            </NuxtLink>

            <NuxtLink
              :to="`/factures/new?clientId=${client.id}`"
              class="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Créer une facture</span>
            </NuxtLink>

            <NuxtLink
              :to="`/clients/${client.id}/edit`"
              class="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Modifier</span>
            </NuxtLink>

            <button
              v-if="canArchiveRestore"
              @click="openArchiveModal"
              class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{{ client.isArchived ? 'Restaurer' : 'Archiver' }}</span>
            </button>

            <button
              v-if="canDelete"
              @click="openDeleteModal"
              class="px-3.5 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Supprimer</span>
            </button>
          </div>
        </div>

        <!-- FINANCIAL SUMMARY KPI CARDS -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <!-- Total Devis -->
          <div class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Devis</span>
            <div class="text-lg font-extrabold text-slate-100">{{ summary?.totalDevis || 0 }}</div>
          </div>

          <!-- Devis Acceptés -->
          <div class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-1">
            <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Devis Acceptés</span>
            <div class="text-lg font-extrabold text-emerald-300">{{ summary?.acceptedDevis || 0 }}</div>
          </div>

          <!-- Total Facturé TTC -->
          <div class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-1">
            <span class="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Total Facturé TTC</span>
            <div class="text-lg font-extrabold text-slate-100">{{ formatMoney(summary?.totalInvoicedTtc || 0) }}</div>
          </div>

          <!-- Total Payé -->
          <div class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-1">
            <span class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Total Payé</span>
            <div class="text-lg font-extrabold text-emerald-400">{{ formatMoney(summary?.totalPaid || 0) }}</div>
          </div>

          <!-- Reste à Payer -->
          <div
            class="border rounded-2xl p-4 space-y-1"
            :class="(summary?.amountDue || 0) > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950/60 border-slate-800/80'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider" :class="(summary?.amountDue || 0) > 0 ? 'text-amber-400' : 'text-slate-400'">Reste à Payer</span>
            <div class="text-lg font-extrabold" :class="(summary?.amountDue || 0) > 0 ? 'text-amber-300' : 'text-slate-100'">{{ formatMoney(summary?.amountDue || 0) }}</div>
          </div>

          <!-- Factures en Retard -->
          <div
            class="border rounded-2xl p-4 space-y-1"
            :class="(summary?.overdueCount || 0) > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-950/60 border-slate-800/80'"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider" :class="(summary?.overdueCount || 0) > 0 ? 'text-rose-400' : 'text-slate-400'">Factures en Retard</span>
            <div class="text-lg font-extrabold" :class="(summary?.overdueCount || 0) > 0 ? 'text-rose-300' : 'text-slate-100'">{{ summary?.overdueCount || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- TABS NAVIGATION BAR -->
      <div class="border-b border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="selectTab(tab.id)"
          class="px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer"
          :class="activeTab === tab.id
            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
            : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/80'"
        >
          <span>{{ tab.label }}</span>
          <span v-if="tab.badge !== undefined" class="px-1.5 py-0.5 rounded-md text-[10px]" :class="activeTab === tab.id ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-300'">
            {{ tab.badge }}
          </span>
        </button>
      </div>

      <!-- TAB 1: VUE D'ENSEMBLE -->
      <div v-if="activeTab === 'overview'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Coordonnées Card -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <svg class="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Informations & Coordonnées</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Email</span>
              <span class="text-slate-200 font-semibold">{{ client.email || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Téléphone</span>
              <span class="text-slate-200 font-semibold">{{ client.phone || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Adresse</span>
              <span class="text-slate-200 font-semibold text-right">{{ client.address || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Ville</span>
              <span class="text-slate-200 font-semibold">{{ client.city || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">ICE</span>
              <span class="text-slate-200 font-semibold font-mono">{{ client.ice || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Registre du Commerce (RC)</span>
              <span class="text-slate-200 font-semibold">{{ client.rc || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Identifiant Fiscal (IF)</span>
              <span class="text-slate-200 font-semibold">{{ client.taxId || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Patente</span>
              <span class="text-slate-200 font-semibold">{{ client.patent || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- Coordonnées Bancaires Card -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
            <svg class="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Informations Bancaires</span>
          </h3>

          <div class="space-y-3 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">Banque</span>
              <span class="text-slate-200 font-semibold">{{ (client as any).bankName || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">RIB</span>
              <span class="text-slate-200 font-mono font-semibold">{{ (client as any).rib || '-' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-800/40">
              <span class="text-slate-400">SWIFT / BIC</span>
              <span class="text-slate-200 font-mono font-semibold">{{ (client as any).swift || '-' }}</span>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-800/60 text-[11px] text-slate-500">
            Fiche créée le {{ formatDate(client.createdAt) }} par {{ client.createdBy?.name || 'Système' }}
          </div>
        </div>
      </div>

      <!-- TAB 2: DEVIS -->
      <div v-else-if="activeTab === 'devis'" class="space-y-4">
        <!-- Devis Search & Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <input
            v-model="devisSearch"
            type="text"
            placeholder="Rechercher par N° ou objet..."
            class="w-full sm:w-72 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            @input="debouncedFetchDevis"
          />

          <div class="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <select
              v-model="devisStatus"
              class="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
              @change="fetchDevis"
            >
              <option value="all">Tous les statuts</option>
              <option value="DRAFT">Brouillon</option>
              <option value="SENT">Envoyé</option>
              <option value="ACCEPTED">Accepté</option>
              <option value="REJECTED">Refusé</option>
              <option value="INVOICED">Facturé</option>
              <option value="EXPIRED">Expiré</option>
            </select>

            <NuxtLink
              :to="`/devis/new?clientId=${client.id}`"
              class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Créer un devis</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Devis Table / Loading / Empty -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div v-if="loadingDevis" class="p-12 text-center text-slate-400 text-xs">
            Chargement des devis...
          </div>

          <div v-else-if="devisList.length === 0" class="p-12 text-center space-y-3">
            <p class="text-xs text-slate-400">Aucun devis pour ce client.</p>
            <NuxtLink
              :to="`/devis/new?clientId=${client.id}`"
              class="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
            >
              Créer un devis
            </NuxtLink>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                  <th class="py-3.5 px-4">N° Devis</th>
                  <th class="py-3.5 px-4">Date</th>
                  <th class="py-3.5 px-4">Objet</th>
                  <th class="py-3.5 px-4">Statut</th>
                  <th class="py-3.5 px-4 text-right">Total TTC</th>
                  <th class="py-3.5 px-4">Validité</th>
                  <th class="py-3.5 px-4">Facture liée</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-xs">
                <tr v-for="q in devisList" :key="q.id" class="hover:bg-slate-800/30 transition-colors">
                  <td class="py-3.5 px-4 font-mono font-bold text-amber-400">
                    <NuxtLink :to="`/devis/${q.id}`" class="hover:underline">
                      {{ q.number }}
                    </NuxtLink>
                  </td>
                  <td class="py-3.5 px-4 text-slate-300">{{ formatDateShort(q.issueDate) }}</td>
                  <td class="py-3.5 px-4 text-slate-200 max-w-xs truncate">{{ q.subject }}</td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" :class="getQuoteStatusClass(q.status)">
                      {{ getQuoteStatusLabel(q.status) }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right font-semibold text-slate-100">{{ formatMoney(q.totalTtc) }}</td>
                  <td class="py-3.5 px-4 text-slate-400">{{ formatDateShort(q.validUntil) }}</td>
                  <td class="py-3.5 px-4 font-mono text-slate-300">
                    <NuxtLink v-if="q.invoice" :to="`/factures/${q.invoice.id}`" class="text-blue-400 hover:underline">
                      {{ q.invoice.number }}
                    </NuxtLink>
                    <span v-else class="text-slate-600">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="devisPagination.totalPages > 1" class="p-4 border-t border-slate-800 flex justify-between items-center text-xs">
            <span class="text-slate-400">Page {{ devisPagination.page }} sur {{ devisPagination.totalPages }}</span>
            <div class="flex gap-2">
              <button
                :disabled="devisPagination.page <= 1"
                @click="changeDevisPage(devisPagination.page - 1)"
                class="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                :disabled="devisPagination.page >= devisPagination.totalPages"
                @click="changeDevisPage(devisPagination.page + 1)"
                class="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: FACTURES -->
      <div v-else-if="activeTab === 'factures'" class="space-y-4">
        <!-- Facture Search & Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <input
            v-model="factureSearch"
            type="text"
            placeholder="Rechercher par N° ou objet..."
            class="w-full sm:w-72 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            @input="debouncedFetchFactures"
          />

          <div class="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <select
              v-model="factureStatus"
              class="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
              @change="fetchFactures"
            >
              <option value="all">Tous les statuts</option>
              <option value="DRAFT">Brouillon</option>
              <option value="FINALIZED">Finalisée</option>
              <option value="CANCELLED">Annulée</option>
            </select>

            <select
              v-model="paymentStatusFilter"
              class="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
              @change="fetchFactures"
            >
              <option value="all">Tous les règlements</option>
              <option value="UNPAID">Impayée</option>
              <option value="PARTIAL">Partielle</option>
              <option value="PAID">Payée</option>
            </select>

            <NuxtLink
              :to="`/factures/new?clientId=${client.id}`"
              class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Créer une facture</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Factures Table / Loading / Empty -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div v-if="loadingFactures" class="p-12 text-center text-slate-400 text-xs">
            Chargement des factures...
          </div>

          <div v-else-if="factureList.length === 0" class="p-12 text-center space-y-3">
            <p class="text-xs text-slate-400">Aucune facture pour ce client.</p>
            <NuxtLink
              :to="`/factures/new?clientId=${client.id}`"
              class="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold"
            >
              Créer une facture
            </NuxtLink>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                  <th class="py-3.5 px-4">N° Facture</th>
                  <th class="py-3.5 px-4">Date</th>
                  <th class="py-3.5 px-4">Échéance</th>
                  <th class="py-3.5 px-4">Statut</th>
                  <th class="py-3.5 px-4">Règlement</th>
                  <th class="py-3.5 px-4 text-right">Total TTC</th>
                  <th class="py-3.5 px-4 text-right">Montant Payé</th>
                  <th class="py-3.5 px-4 text-right">Reste à Payer</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-xs">
                <tr v-for="inv in factureList" :key="inv.id" class="hover:bg-slate-800/30 transition-colors">
                  <td class="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    <NuxtLink :to="`/factures/${inv.id}`" class="hover:underline">
                      {{ inv.number || '[Brouillon]' }}
                    </NuxtLink>
                  </td>
                  <td class="py-3.5 px-4 text-slate-300">{{ formatDateShort(inv.issueDate) }}</td>
                  <td class="py-3.5 px-4" :class="inv.isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-400'">
                    {{ formatDateShort(inv.dueDate) }}
                    <span v-if="inv.isOverdue" class="ml-1 text-[9px] px-1 py-0.5 bg-rose-500/20 text-rose-300 rounded font-bold uppercase">En retard</span>
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" :class="getInvoiceStatusClass(inv.status)">
                      {{ getInvoiceStatusLabel(inv.status) }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" :class="getPaymentStatusClass(inv.paymentStatus)">
                      {{ getPaymentStatusLabel(inv.paymentStatus) }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 text-right font-semibold text-slate-100">{{ formatMoney(inv.totalTtc) }}</td>
                  <td class="py-3.5 px-4 text-right font-semibold text-emerald-400">{{ formatMoney(inv.amountPaid) }}</td>
                  <td class="py-3.5 px-4 text-right font-semibold" :class="Number(inv.amountDue) > 0 ? 'text-amber-300' : 'text-slate-400'">
                    {{ formatMoney(inv.amountDue) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="facturePagination.totalPages > 1" class="p-4 border-t border-slate-800 flex justify-between items-center text-xs">
            <span class="text-slate-400">Page {{ facturePagination.page }} sur {{ facturePagination.totalPages }}</span>
            <div class="flex gap-2">
              <button
                :disabled="facturePagination.page <= 1"
                @click="changeFacturePage(facturePagination.page - 1)"
                class="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                :disabled="facturePagination.page >= facturePagination.totalPages"
                @click="changeFacturePage(facturePagination.page + 1)"
                class="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 4: PAIEMENTS -->
      <div v-else-if="activeTab === 'payments'" class="space-y-4">
        <!-- Payments Table / Loading / Empty -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div v-if="loadingPayments" class="p-12 text-center text-slate-400 text-xs">
            Chargement de l'historique des règlements...
          </div>

          <div v-else-if="paymentList.length === 0" class="p-12 text-center text-slate-400 text-xs">
            Aucun paiement enregistré pour ce client.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                  <th class="py-3.5 px-4">Date</th>
                  <th class="py-3.5 px-4">Facture</th>
                  <th class="py-3.5 px-4">Mode de paiement</th>
                  <th class="py-3.5 px-4">Référence</th>
                  <th class="py-3.5 px-4 text-right">Montant</th>
                  <th class="py-3.5 px-4">Enregistré par</th>
                  <th class="py-3.5 px-4">Statut</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 text-xs">
                <tr v-for="pm in paymentList" :key="pm.id" class="hover:bg-slate-800/30 transition-colors">
                  <td class="py-3.5 px-4 text-slate-300">{{ formatDateShort(pm.paymentDate) }}</td>
                  <td class="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    <NuxtLink v-if="pm.invoice" :to="`/factures/${pm.invoice.id}`" class="hover:underline">
                      {{ pm.invoice.number }}
                    </NuxtLink>
                    <span v-else>-</span>
                  </td>
                  <td class="py-3.5 px-4 text-slate-200">{{ formatPaymentMethod(pm.method) }}</td>
                  <td class="py-3.5 px-4 font-mono text-slate-400">{{ pm.reference || '-' }}</td>
                  <td class="py-3.5 px-4 text-right font-extrabold text-emerald-400">{{ formatMoney(pm.amount) }}</td>
                  <td class="py-3.5 px-4 text-slate-400">{{ pm.createdBy?.name || 'Système' }}</td>
                  <td class="py-3.5 px-4">
                    <span
                      class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"
                      :class="pm.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300 line-through'"
                    >
                      {{ pm.status === 'CONFIRMED' ? 'Confirmé' : 'Annulé' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="paymentPagination.totalPages > 1" class="p-4 border-t border-slate-800 flex justify-between items-center text-xs">
            <span class="text-slate-400">Page {{ paymentPagination.page }} sur {{ paymentPagination.totalPages }}</span>
            <div class="flex gap-2">
              <button
                :disabled="paymentPagination.page <= 1"
                @click="changePaymentPage(paymentPagination.page - 1)"
                class="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                :disabled="paymentPagination.page >= paymentPagination.totalPages"
                @click="changePaymentPage(paymentPagination.page + 1)"
                class="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 5: ACTIVITÉS -->
      <div v-else-if="activeTab === 'activities'" class="space-y-4">
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div v-if="loadingActivities" class="p-12 text-center text-slate-400 text-xs">
            Chargement du journal des activités...
          </div>

          <div v-else-if="activityList.length === 0" class="p-12 text-center text-slate-400 text-xs">
            Aucune activité enregistrée pour ce client.
          </div>

          <div v-else class="relative border-l-2 border-slate-800 ml-4 space-y-6 my-2">
            <div v-for="act in activityList" :key="act.id" class="relative pl-6">
              <div class="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-amber-500"></div>
              <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="text-xs font-bold text-slate-200">{{ formatActionLabel(act.action) }}</span>
                  <span class="text-[11px] text-slate-500">{{ formatDate(act.createdAt) }}</span>
                </div>
                <p class="text-xs text-slate-400">
                  Par <strong class="text-slate-300">{{ act.user?.name || 'Système' }}</strong>
                  <span v-if="act.entityType" class="ml-2 text-slate-500">({{ act.entityType }})</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="activityPagination.totalPages > 1" class="pt-4 mt-4 border-t border-slate-800 flex justify-between items-center text-xs">
            <span class="text-slate-400">Page {{ activityPagination.page }} sur {{ activityPagination.totalPages }}</span>
            <div class="flex gap-2">
              <button
                :disabled="activityPagination.page <= 1"
                @click="changeActivityPage(activityPagination.page - 1)"
                class="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                :disabled="activityPagination.page >= activityPagination.totalPages"
                @click="changeActivityPage(activityPagination.page + 1)"
                class="px-3 py-1 bg-slate-800 text-slate-200 rounded-lg disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Confirmation Dialog -->
      <ConfirmDialog
        :show="showConfirmModal"
        :title="confirmModalTitle"
        :message="confirmModalMessage"
        :confirm-text="confirmModalButtonText"
        :danger="modalActionType === 'delete'"
        :loading="actionLoading"
        :require-match-text="modalActionType === 'delete' ? client.displayName : undefined"
        @confirm="executeClientAction"
        @cancel="showConfirmModal = false"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ClientTypeBadge from '~/components/clients/ClientTypeBadge.vue'
import ClientStatusBadge from '~/components/clients/ClientStatusBadge.vue'
import ConfirmDialog from '~/components/ui/ConfirmDialog.vue'
import { formatMoney } from '~/server/utils/calculation'
import type { ClientWithUser } from '~/composables/useClients'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const notify = useNotify()
const { fetchClient, archiveClient, restoreClient, deleteClient } = useClients()

const client = ref<ClientWithUser | null>(null)
const summary = ref<any>(null)
const loadingClient = ref(true)

const activeTab = ref<string>((route.query.tab as string) || 'overview')

const canArchiveRestore = computed(() => ['SUPER_ADMIN', 'ACCOUNTANT'].includes(user.value?.role || ''))
const canDelete = computed(() => user.value?.role === 'SUPER_ADMIN')

// Tabs Definition
const tabs = computed(() => [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'devis', label: 'Devis', badge: summary.value?.totalDevis },
  { id: 'factures', label: 'Factures', badge: summary.value?.totalFactures },
  { id: 'payments', label: 'Paiements' },
  { id: 'activities', label: 'Activités' }
])

// Modal states
const showConfirmModal = ref(false)
const modalActionType = ref<'archive' | 'restore' | 'delete'>('archive')
const actionLoading = ref(false)

// Devis tab state
const devisList = ref<any[]>([])
const loadingDevis = ref(false)
const devisSearch = ref('')
const devisStatus = ref('all')
const devisPagination = ref({ page: 1, totalPages: 1 })
let devisDebounceTimer: any = null

// Factures tab state
const factureList = ref<any[]>([])
const loadingFactures = ref(false)
const factureSearch = ref('')
const factureStatus = ref('all')
const paymentStatusFilter = ref('all')
const facturePagination = ref({ page: 1, totalPages: 1 })
let factureDebounceTimer: any = null

// Payments tab state
const paymentList = ref<any[]>([])
const loadingPayments = ref(false)
const paymentPagination = ref({ page: 1, totalPages: 1 })

// Activities tab state
const activityList = ref<any[]>([])
const loadingActivities = ref(false)
const activityPagination = ref({ page: 1, totalPages: 1 })

const confirmModalTitle = computed(() => {
  if (modalActionType.value === 'delete') return 'Supprimer définitivement le client'
  if (modalActionType.value === 'archive') return 'Archiver le client'
  return 'Restaurer le client'
})

const confirmModalMessage = computed(() => {
  if (!client.value) return ''
  if (modalActionType.value === 'delete') {
    return `Êtes-vous sûr de vouloir supprimer définitivement "${client.value.displayName}" ? Cette action est irréversible.`
  }
  if (modalActionType.value === 'archive') {
    return `Voulez-vous archiver le client "${client.value.displayName}" ?`
  }
  return `Voulez-vous restaurer le client "${client.value.displayName}" dans la liste des clients actifs ?`
})

const confirmModalButtonText = computed(() => {
  if (modalActionType.value === 'delete') return 'Supprimer définitivement'
  if (modalActionType.value === 'archive') return 'Archiver'
  return 'Restaurer'
})

function selectTab(tabId: string) {
  activeTab.value = tabId
  router.replace({ query: { ...route.query, tab: tabId } })

  if (tabId === 'devis') fetchDevis()
  if (tabId === 'factures') fetchFactures()
  if (tabId === 'payments') fetchPayments()
  if (tabId === 'activities') fetchActivities()
}

async function loadClientData() {
  const id = route.params.id as string
  if (id) {
    loadingClient.value = true
    try {
      const [c, s] = await Promise.all([
        fetchClient(id),
        $fetch<any>(`/api/clients/${id}/summary`).catch(() => null)
      ])
      client.value = c
      summary.value = s?.data || null
    } finally {
      loadingClient.value = false
    }
  }
}

async function fetchDevis() {
  if (!client.value) return
  loadingDevis.value = true
  try {
    const query = new URLSearchParams({
      page: String(devisPagination.value.page),
      search: devisSearch.value,
      status: devisStatus.value
    })
    const res = await $fetch<any>(`/api/clients/${client.value.id}/devis?${query.toString()}`)
    if (res.success) {
      devisList.value = res.data.data
      devisPagination.value = res.data.pagination
    }
  } finally {
    loadingDevis.value = false
  }
}

function debouncedFetchDevis() {
  clearTimeout(devisDebounceTimer)
  devisDebounceTimer = setTimeout(() => {
    devisPagination.value.page = 1
    fetchDevis()
  }, 300)
}

function changeDevisPage(p: number) {
  devisPagination.value.page = p
  fetchDevis()
}

async function fetchFactures() {
  if (!client.value) return
  loadingFactures.value = true
  try {
    const query = new URLSearchParams({
      page: String(facturePagination.value.page),
      search: factureSearch.value,
      status: factureStatus.value,
      paymentStatus: paymentStatusFilter.value
    })
    const res = await $fetch<any>(`/api/clients/${client.value.id}/factures?${query.toString()}`)
    if (res.success) {
      factureList.value = res.data.data
      facturePagination.value = res.data.pagination
    }
  } finally {
    loadingFactures.value = false
  }
}

function debouncedFetchFactures() {
  clearTimeout(factureDebounceTimer)
  factureDebounceTimer = setTimeout(() => {
    facturePagination.value.page = 1
    fetchFactures()
  }, 300)
}

function changeFacturePage(p: number) {
  facturePagination.value.page = p
  fetchFactures()
}

async function fetchPayments() {
  if (!client.value) return
  loadingPayments.value = true
  try {
    const res = await $fetch<any>(`/api/clients/${client.value.id}/payments?page=${paymentPagination.value.page}`)
    if (res.success) {
      paymentList.value = res.data.data
      paymentPagination.value = res.data.pagination
    }
  } finally {
    loadingPayments.value = false
  }
}

function changePaymentPage(p: number) {
  paymentPagination.value.page = p
  fetchPayments()
}

async function fetchActivities() {
  if (!client.value) return
  loadingActivities.value = true
  try {
    const res = await $fetch<any>(`/api/clients/${client.value.id}/activities?page=${activityPagination.value.page}`)
    if (res.success) {
      activityList.value = res.data.data
      activityPagination.value = res.data.pagination
    }
  } finally {
    loadingActivities.value = false
  }
}

function changeActivityPage(p: number) {
  activityPagination.value.page = p
  fetchActivities()
}

function openArchiveModal() {
  if (!client.value) return
  modalActionType.value = client.value.isArchived ? 'restore' : 'archive'
  showConfirmModal.value = true
}

function openDeleteModal() {
  if (!client.value) return
  modalActionType.value = 'delete'
  showConfirmModal.value = true
}

async function executeClientAction() {
  if (!client.value) return
  actionLoading.value = true

  try {
    let ok = false
    if (modalActionType.value === 'archive') {
      ok = await archiveClient(client.value.id)
      if (ok) notify.success('Archivage', 'Le client a été archivé avec succès.')
    } else if (modalActionType.value === 'restore') {
      ok = await restoreClient(client.value.id)
      if (ok) notify.success('Restauration', 'Le client a été restauré avec succès.')
    } else if (modalActionType.value === 'delete') {
      try {
        ok = await deleteClient(client.value.id)
        if (ok) {
          notify.success('Suppression', 'Le client a été supprimé définitivement.')
          await router.push('/clients')
          return
        }
      } catch (err: any) {
        showConfirmModal.value = false
        const msg = err.data?.message || err.message || 'Ce client ne peut pas être supprimé.'
        notify.error('Erreur', msg)
        return
      }
    }

    if (ok) {
      showConfirmModal.value = false
      await loadClientData()
    }
  } finally {
    actionLoading.value = false
  }
}

function formatDate(dateInput: string | Date): string {
  if (!dateInput) return '-'
  return new Date(dateInput).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDateShort(dateInput: string | Date): string {
  if (!dateInput) return '-'
  return new Date(dateInput).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatPaymentMethod(m: string): string {
  const map: Record<string, string> = {
    BANK_TRANSFER: 'Virement bancaire',
    VIREMENT: 'Virement bancaire',
    CHEQUE: 'Chèque',
    CASH: 'Espèces',
    ESPECES: 'Espèces',
    CARD: 'Carte bancaire',
    OTHER: 'Autre'
  }
  return map[m] || m || 'Autre'
}

function getQuoteStatusLabel(s: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Brouillon',
    SENT: 'Envoyé',
    ACCEPTED: 'Accepté',
    REJECTED: 'Refusé',
    INVOICED: 'Facturé',
    EXPIRED: 'Expiré'
  }
  return map[s] || s
}

function getQuoteStatusClass(s: string): string {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-800 text-slate-300',
    SENT: 'bg-blue-500/20 text-blue-300',
    ACCEPTED: 'bg-emerald-500/20 text-emerald-300',
    REJECTED: 'bg-rose-500/20 text-rose-300',
    INVOICED: 'bg-purple-500/20 text-purple-300',
    EXPIRED: 'bg-amber-500/20 text-amber-300'
  }
  return map[s] || 'bg-slate-800 text-slate-300'
}

function getInvoiceStatusLabel(s: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Brouillon',
    FINALIZED: 'Finalisée',
    CANCELLED: 'Annulée'
  }
  return map[s] || s
}

function getInvoiceStatusClass(s: string): string {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-800 text-slate-300',
    FINALIZED: 'bg-blue-500/20 text-blue-300',
    CANCELLED: 'bg-rose-500/20 text-rose-300'
  }
  return map[s] || 'bg-slate-800 text-slate-300'
}

function getPaymentStatusLabel(s: string): string {
  const map: Record<string, string> = {
    UNPAID: 'Impayée',
    PARTIALLY_PAID: 'Partielle',
    PARTIAL: 'Partielle',
    PAID: 'Payée'
  }
  return map[s] || s
}

function getPaymentStatusClass(s: string): string {
  const map: Record<string, string> = {
    UNPAID: 'bg-rose-500/20 text-rose-300',
    PARTIALLY_PAID: 'bg-amber-500/20 text-amber-300',
    PARTIAL: 'bg-amber-500/20 text-amber-300',
    PAID: 'bg-emerald-500/20 text-emerald-300'
  }
  return map[s] || 'bg-slate-800 text-slate-300'
}

function formatActionLabel(a: string): string {
  const map: Record<string, string> = {
    CLIENT_CREATED: 'Création du client',
    CLIENT_UPDATED: 'Modification des coordonnées',
    CLIENT_ARCHIVED: 'Archivage du client',
    CLIENT_RESTORED: 'Restauration du client',
    CLIENT_DELETE_REJECTED: 'Tentative de suppression rejetée (documents liés)',
    QUOTE_CREATED: 'Création d’un devis',
    QUOTE_UPDATED: 'Modification d’un devis',
    QUOTE_CONVERTED: 'Conversion d’un devis en facture',
    INVOICE_CREATED: 'Création d’une facture',
    INVOICE_FINALIZED: 'Finalisation d’une facture',
    PAYMENT_RECORDED: 'Enregistrement d’un paiement'
  }
  return map[a] || a
}

onMounted(async () => {
  await loadClientData()
  selectTab(activeTab.value)
})
</script>
