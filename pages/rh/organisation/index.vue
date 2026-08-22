<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-main tracking-tight">Organisation</h1>
        <p class="text-xs text-secondary-custom mt-1">Gérez les sites, départements et postes d’Atlas CRM.</p>
      </div>

      <button
        @click="openCreateModal"
        class="px-4 py-2.5 bg-brand text-on-brand hover:bg-brand-strong text-xs font-bold rounded-pill transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
        <span>Nouveau {{ activeTab === 'sites' ? 'site' : activeTab === 'departments' ? 'département' : 'poste' }}</span>
      </button>
    </div>

    <!-- Navigation Tabs -->
    <div class="bg-panel border border-custom rounded-panel p-1.5 flex flex-wrap gap-2 shadow-soft">
      <button
        @click="activeTab = 'sites'"
        :class="[
          activeTab === 'sites'
            ? 'bg-brand-soft text-brand-strong border-brand-soft font-bold'
            : 'text-muted-custom hover:text-main hover:bg-surface-hover border-transparent',
          'px-4 py-2 rounded-pill text-xs transition-all border font-semibold flex items-center gap-2 cursor-pointer'
        ]"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span>Sites de travail</span>
      </button>

      <button
        @click="activeTab = 'departments'"
        :class="[
          activeTab === 'departments'
            ? 'bg-brand-soft text-brand-strong border-brand-soft font-bold'
            : 'text-muted-custom hover:text-main hover:bg-surface-hover border-transparent',
          'px-4 py-2 rounded-pill text-xs transition-all border font-semibold flex items-center gap-2 cursor-pointer'
        ]"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <span>Départements</span>
      </button>

      <button
        @click="activeTab = 'positions'"
        :class="[
          activeTab === 'positions'
            ? 'bg-brand-soft text-brand-strong border-brand-soft font-bold'
            : 'text-muted-custom hover:text-main hover:bg-surface-hover border-transparent',
          'px-4 py-2 rounded-pill text-xs transition-all border font-semibold flex items-center gap-2 cursor-pointer'
        ]"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span>Postes</span>
      </button>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="bg-panel border border-custom rounded-panel p-4 space-y-4 shadow-soft">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="w-full sm:w-80">
          <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Recherche</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher par code, nom..."
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 pl-9 text-xs text-main placeholder-muted-custom focus:outline-none focus:border-brand transition-colors"
            />
            <svg class="w-4 h-4 text-muted-custom absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <!-- Include Archived Toggle -->
        <div class="flex items-center gap-2 pt-4 sm:pt-6 self-start sm:self-auto">
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="showArchived"
              class="sr-only peer"
            />
            <div class="w-9 h-5 bg-panel-raised peer-focus:outline-none rounded-pill peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-custom after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
          </label>
          <span class="text-xs text-secondary-custom font-semibold">Inclure les éléments archivés</span>
        </div>
      </div>
    </div>

    <!-- Sites Table -->
    <div v-if="activeTab === 'sites'" class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
      <div v-else-if="sites.length === 0" class="text-center py-16 space-y-3">
        <div class="w-12 h-12 rounded-pill bg-panel-raised text-muted-custom flex items-center justify-center mx-auto border border-custom">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p class="text-xs font-bold text-main">Aucun site trouvé</p>
        <p class="text-xs text-muted-custom max-w-sm mx-auto">Modifiez les filtres de recherche ou créez un nouveau site de travail.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-custom bg-panel-raised text-xs font-bold text-muted-custom uppercase tracking-wider">
              <th class="py-3.5 px-4">Code</th>
              <th class="py-3.5 px-4">Nom du site</th>
              <th class="py-3.5 px-4">Type</th>
              <th class="py-3.5 px-4">Ville</th>
              <th class="py-3.5 px-4">Responsable</th>
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom text-xs">
            <tr v-for="site in sites" :key="site.id" class="hover:bg-surface-hover transition-colors">
              <td class="py-3 px-4 font-mono font-bold text-brand-strong">{{ site.code }}</td>
              <td class="py-3 px-4 font-bold text-main">{{ site.name }}</td>
              <td class="py-3 px-4 text-secondary-custom">
                <span class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-panel-raised text-secondary-custom border border-custom">
                  {{ formatWorkSiteType(site.type) }}
                </span>
              </td>
              <td class="py-3 px-4 text-secondary-custom">{{ site.city || '—' }}</td>
              <td class="py-3 px-4 text-secondary-custom">{{ site.managerEmployee?.displayName || '—' }}</td>
              <td class="py-3 px-4">
                <span v-if="site.archivedAt" class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Archivé</span>
                <span v-else-if="site.isActive" class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Actif</span>
                <span v-else class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Inactif</span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="!site.archivedAt"
                    @click="openEditModal(site)"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-brand rounded-control transition-colors cursor-pointer"
                    title="Éditer"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    v-if="!site.archivedAt"
                    @click="openArchiveModal(site)"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-rose-600 dark:hover:text-rose-400 rounded-control transition-colors cursor-pointer"
                    title="Archiver"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <button
                    v-if="site.archivedAt"
                    @click="handleRestore(site)"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-emerald-600 dark:hover:text-emerald-400 rounded-control transition-colors cursor-pointer"
                    title="Restaurer"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Departments Table -->
    <div v-if="activeTab === 'departments'" class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
      <div v-else-if="departments.length === 0" class="text-center py-16 space-y-3">
        <div class="w-12 h-12 rounded-pill bg-panel-raised text-muted-custom flex items-center justify-center mx-auto border border-custom">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p class="text-xs font-bold text-main">Aucun département trouvé</p>
        <p class="text-xs text-muted-custom max-w-sm mx-auto">Modifiez les filtres de recherche ou créez un nouveau département.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-custom bg-panel-raised text-xs font-bold text-muted-custom uppercase tracking-wider">
              <th class="py-3.5 px-4">Code</th>
              <th class="py-3.5 px-4">Intitulé du département</th>
              <th class="py-3.5 px-4">Responsable</th>
              <th class="py-3.5 px-4">Postes associés</th>
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom text-xs">
            <tr v-for="dept in departments" :key="dept.id" class="hover:bg-surface-hover transition-colors">
              <td class="py-3 px-4 font-mono font-bold text-brand-strong">{{ dept.code }}</td>
              <td class="py-3 px-4 font-bold text-main">{{ dept.name }}</td>
              <td class="py-3 px-4 text-secondary-custom">{{ dept.managerEmployee?.displayName || '—' }}</td>
              <td class="py-3 px-4 text-secondary-custom font-mono">{{ dept._count?.positions || 0 }} poste(s)</td>
              <td class="py-3 px-4">
                <span v-if="dept.archivedAt" class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Archivé</span>
                <span v-else-if="dept.isActive" class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Actif</span>
                <span v-else class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Inactif</span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="!dept.archivedAt"
                    @click="openEditModal(dept)"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-brand rounded-control transition-colors cursor-pointer"
                    title="Éditer"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    v-if="!dept.archivedAt"
                    @click="openArchiveModal(dept)"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-rose-600 dark:hover:text-rose-400 rounded-control transition-colors cursor-pointer"
                    title="Archiver"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <button
                    v-if="dept.archivedAt"
                    @click="handleRestore(dept)"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-emerald-600 dark:hover:text-emerald-400 rounded-control transition-colors cursor-pointer"
                    title="Restaurer"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Positions Table -->
    <div v-if="activeTab === 'positions'" class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
      <div v-else-if="positions.length === 0" class="text-center py-16 space-y-3">
        <div class="w-12 h-12 rounded-pill bg-panel-raised text-muted-custom flex items-center justify-center mx-auto border border-custom">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <p class="text-xs font-bold text-main">Aucun poste trouvé</p>
        <p class="text-xs text-muted-custom max-w-sm mx-auto">Modifiez les filtres de recherche ou créez un nouveau poste.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-custom bg-panel-raised text-xs font-bold text-muted-custom uppercase tracking-wider">
              <th class="py-3.5 px-4">Code</th>
              <th class="py-3.5 px-4">Intitulé du poste</th>
              <th class="py-3.5 px-4">Département</th>
              <th class="py-3.5 px-4">Type</th>
              <th class="py-3.5 px-4">Statut</th>
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom text-xs">
            <tr v-for="pos in positions" :key="pos.id" class="hover:bg-surface-hover transition-colors">
              <td class="py-3 px-4 font-mono font-bold text-brand-strong">{{ pos.code }}</td>
              <td class="py-3 px-4 font-bold text-main">{{ pos.title }}</td>
              <td class="py-3 px-4 text-secondary-custom">{{ pos.department?.name || '—' }}</td>
              <td class="py-3 px-4">
                <span v-if="pos.isManagerial" class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">Managérial</span>
                <span v-else class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-panel-raised text-secondary-custom border border-custom">Opérationnel</span>
              </td>
              <td class="py-3 px-4">
                <span v-if="pos.archivedAt" class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">Archivé</span>
                <span v-else-if="pos.isActive" class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Actif</span>
                <span v-else class="px-2.5 py-0.5 rounded-pill text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Inactif</span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    v-if="!pos.archivedAt"
                    @click="openEditModal(pos)"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-brand rounded-control transition-colors cursor-pointer"
                    title="Éditer"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    v-if="!pos.archivedAt"
                    @click="openArchiveModal(pos)"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-rose-600 dark:hover:text-rose-400 rounded-control transition-colors cursor-pointer"
                    title="Archiver"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <button
                    v-if="pos.archivedAt"
                    @click="handleRestore(pos)"
                    class="p-1.5 hover:bg-surface-hover text-muted-custom hover:text-emerald-600 dark:hover:text-emerald-400 rounded-control transition-colors cursor-pointer"
                    title="Restaurer"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Archive Confirmation Modal -->
    <div v-if="showArchiveModal" class="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-panel border border-custom rounded-panel max-w-md w-full p-6 shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <div class="w-10 h-10 rounded-pill bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-base font-bold text-main">Confirmation d’archivage</h3>
        </div>

        <p class="text-xs text-secondary-custom leading-relaxed">
          Pour archiver l’élément <strong class="font-mono text-brand-strong font-bold">{{ targetItem?.code }}</strong>, saisissez exactement la formule de confirmation ci-dessous :
        </p>

        <div class="p-2.5 bg-panel-raised border border-custom rounded-control font-mono text-xs font-bold text-center select-all text-brand-strong">
          ARCHIVER {{ targetItem?.code }}
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Code de confirmation</label>
            <input
              v-model="archiveConfirmInput"
              type="text"
              placeholder="ARCHIVER CODE"
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs font-mono text-main placeholder-muted-custom focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-custom uppercase tracking-wider mb-1">Motif d’archivage (obligatoire)</label>
            <textarea
              v-model="archiveReasonInput"
              rows="2"
              placeholder="Motif justifiant cet archivage..."
              class="w-full bg-panel-raised border border-custom rounded-control px-3 py-2 text-xs text-main placeholder-muted-custom focus:outline-none focus:border-rose-500 transition-colors"
            ></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="showArchiveModal = false"
            class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main border border-custom rounded-control text-xs font-semibold transition-colors cursor-pointer"
          >
            Annuler
          </button>
          <button
            @click="confirmArchive"
            class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-control text-xs font-bold transition-colors shadow-sm cursor-pointer"
          >
            Archiver l’élément
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatWorkSiteType } from '~/utils/hrFormatters'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const activeTab = ref<'sites' | 'departments' | 'positions'>('sites')
const searchQuery = ref('')
const showArchived = ref(false)
const loading = ref(false)

const sites = ref<any[]>([])
const departments = ref<any[]>([])
const positions = ref<any[]>([])

const showArchiveModal = ref(false)
const targetItem = ref<any>(null)
const archiveConfirmInput = ref('')
const archiveReasonInput = ref('')

const notify = useNotify()

watch([activeTab, searchQuery, showArchived], () => {
  loadData()
}, { immediate: true })

async function loadData() {
  loading.value = true
  try {
    const params: any = {
      search: searchQuery.value,
      isArchived: showArchived.value
    }
    if (activeTab.value === 'sites') {
      const res = await $fetch<any>('/api/rh/sites', { params })
      sites.value = res.data || []
    } else if (activeTab.value === 'departments') {
      const res = await $fetch<any>('/api/rh/departements', { params })
      departments.value = res.data || []
    } else if (activeTab.value === 'positions') {
      const res = await $fetch<any>('/api/rh/postes', { params })
      positions.value = res.data || []
    }
  } catch (err: any) {
    notify.notifyError(err.data?.message || 'Erreur lors du chargement des données.')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  notify.info('Information', `Création de ${activeTab.value} bientôt disponible.`)
}

function openEditModal(item: any) {
  notify.info('Information', `Édition de ${item.code} bientôt disponible.`)
}

function openArchiveModal(item: any) {
  targetItem.value = item
  archiveConfirmInput.value = ''
  archiveReasonInput.value = ''
  showArchiveModal.value = true
}

async function confirmArchive() {
  if (!targetItem.value) return
  try {
    const endpoint = activeTab.value === 'sites'
      ? `/api/rh/sites/${targetItem.value.id}/archive`
      : activeTab.value === 'departments'
      ? `/api/rh/departements/${targetItem.value.id}/archive`
      : `/api/rh/postes/${targetItem.value.id}/archive`

    await $fetch(endpoint, {
      method: 'POST',
      body: {
        version: targetItem.value.version,
        confirmCode: archiveConfirmInput.value,
        archiveReason: archiveReasonInput.value
      }
    })
    notify.notifySuccess('Élément archivé avec succès.')
    showArchiveModal.value = false
    loadData()
  } catch (err: any) {
    notify.notifyError(err.data?.message || 'Erreur lors de l’archivage.')
  }
}

async function handleRestore(item: any) {
  try {
    const endpoint = activeTab.value === 'sites'
      ? `/api/rh/sites/${item.id}/restore`
      : activeTab.value === 'departments'
      ? `/api/rh/departements/${item.id}/restore`
      : `/api/rh/postes/${item.id}/restore`

    await $fetch(endpoint, { method: 'POST' })
    notify.notifySuccess('Élément restauré avec succès.')
    loadData()
  } catch (err: any) {
    notify.notifyError(err.data?.message || 'Erreur lors de la restauration.')
  }
}
</script>
