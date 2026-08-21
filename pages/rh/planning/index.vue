<template>
  <div class="space-y-6 print:space-y-0 print:p-0 print:bg-white print:text-slate-900">
    <!-- Printable Header for @media print -->
    <div class="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 uppercase tracking-wide">Atlas CRM — Planning RH</h1>
          <h2 class="text-lg font-semibold text-slate-700 mt-1">Site : {{ activeSiteName }} ({{ activeSiteCode }})</h2>
          <p class="text-xs text-slate-600">Période du {{ weekRangeLabel }} | Statut : {{ formatScheduleStatus(schedule?.status) }}</p>
        </div>
        <div class="text-right text-xs text-muted-custom">
          <div>Imprimé le {{ new Date().toLocaleDateString('fr-FR') }}</div>
          <div v-if="schedule?.publishedByName">Publié par {{ schedule.publishedByName }}</div>
        </div>
      </div>
    </div>

    <!-- Top Bar Navigation & Controls -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-panel border border-custom p-5 rounded-panel shadow-soft backdrop-blur-sm print:hidden transition-colors">
      <div class="flex flex-wrap items-center gap-4">
        <!-- Site Selector -->
        <div>
          <label class="block text-[10px] text-muted-custom font-bold uppercase tracking-wider mb-1">Site de travail</label>
          <select v-model="selectedSiteId" class="bg-panel-raised border border-custom text-main text-xs rounded-control px-3 py-2 focus:outline-none focus:border-brand min-w-[200px]">
            <option value="">Sélectionnez un site</option>
            <option v-for="site in sites" :key="site.id" :value="site.id">{{ site.name }} ({{ site.code }})</option>
          </select>
        </div>

        <!-- View Switcher (Weekly vs Monthly) -->
        <div>
          <label class="block text-[10px] text-muted-custom font-bold uppercase tracking-wider mb-1">Vue d'affichage</label>
          <div class="flex items-center bg-panel-raised p-0.5 rounded-pill border border-custom">
            <button
              @click="activeView = 'WEEK'"
              :class="activeView === 'WEEK' ? 'bg-brand text-on-brand hover:bg-brand-strong font-bold shadow-sm' : 'text-muted-custom hover:text-main'"
              class="px-3 py-1 rounded-pill text-xs transition-colors cursor-pointer"
            >
              Semaine
            </button>
            <button
              @click="activeView = 'MONTH'"
              :class="activeView === 'MONTH' ? 'bg-brand text-on-brand hover:bg-brand-strong font-bold shadow-sm' : 'text-muted-custom hover:text-main'"
              class="px-3 py-1 rounded-pill text-xs transition-colors cursor-pointer"
            >
              Mois
            </button>
          </div>
        </div>

        <!-- Week / Month Navigator -->
        <div class="flex items-center gap-2 pt-4 sm:pt-0">
          <button @click="navigatePeriod(-1)" class="p-2 bg-panel-raised hover:bg-surface-hover text-main rounded-control border border-custom transition-colors cursor-pointer" title="Précédent">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button @click="goToday()" class="px-3 py-1.5 bg-panel-raised hover:bg-surface-hover text-main text-xs rounded-control font-bold border border-custom cursor-pointer">
            Aujourd'hui
          </button>

          <button @click="navigatePeriod(1)" class="p-2 bg-panel-raised hover:bg-surface-hover text-main rounded-control border border-custom transition-colors cursor-pointer" title="Suivant">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <span class="text-xs font-bold text-main ml-2 font-mono">
            {{ activeView === 'WEEK' ? `Semaine du ${weekRangeLabel}` : monthPeriodLabel }}
          </span>
        </div>

        <!-- Schedule Status Badge -->
        <div v-if="schedule" class="pt-4 sm:pt-0">
          <span :class="getScheduleStatusBadgeClass(schedule.status)" class="px-2.5 py-1 rounded-pill text-xs font-bold">
            {{ formatScheduleStatus(schedule.status) }}
          </span>
        </div>
      </div>

      <!-- Quick Action Controls -->
      <div v-if="selectedSiteId" class="flex flex-wrap items-center gap-2.5">
        <NuxtLink to="/rh/planning/modeles" class="px-3 py-2 bg-panel-raised hover:bg-surface-hover text-main text-xs rounded-control font-bold border border-custom transition-colors flex items-center gap-1.5 cursor-pointer">
          <svg class="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          Modèles
        </NuxtLink>

        <button @click="showCopyModal = true" class="px-3 py-2 bg-panel-raised hover:bg-surface-hover text-main text-xs rounded-control font-bold border border-custom transition-colors flex items-center gap-1.5 cursor-pointer">
          <svg class="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          Copier semaine
        </button>

        <button @click="printSchedule()" class="px-3 py-2 bg-panel-raised hover:bg-surface-hover text-main text-xs rounded-control font-bold border border-custom transition-colors flex items-center gap-1.5 cursor-pointer">
          <svg class="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimer
        </button>

        <button
          v-if="schedule && schedule.status === 'DRAFT'"
          @click="showPublishModal = true"
          class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-control shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Publier le planning
        </button>
      </div>
    </div>

    <!-- Empty Site State -->
    <div v-if="!selectedSiteId" class="bg-panel border border-custom p-12 rounded-panel text-center print:hidden shadow-soft">
      <svg class="w-16 h-16 text-muted-custom mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <h3 class="text-base font-bold text-main">Sélectionnez un site de travail</h3>
      <p class="text-xs text-muted-custom max-w-md mx-auto mt-1">Choisissez un site dans le menu ci-dessus pour charger son planning de travail.</p>
    </div>

    <!-- Main Planning Area -->
    <div v-else class="space-y-4">
      <!-- Indicators & Staffing Summary Bar -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div class="bg-panel border border-custom p-4 rounded-card flex items-center justify-between shadow-soft">
          <div>
            <span class="text-xs text-muted-custom block font-medium">Heures totales planifiées</span>
            <span class="text-xl font-black text-main font-mono mt-0.5 block">{{ totalPlannedHours.toFixed(1) }} h</span>
          </div>
          <div class="p-3 bg-brand-soft rounded-control text-brand-strong">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div class="bg-panel border border-custom p-4 rounded-card flex items-center justify-between shadow-soft">
          <div>
            <span class="text-xs text-muted-custom block font-medium">Effectif / Shifts actifs</span>
            <span class="text-xl font-black text-main font-mono mt-0.5 block">{{ activeShiftsCount }} shifts</span>
          </div>
          <div class="p-3 bg-purple-500/10 rounded-control text-purple-600 dark:text-purple-400">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <div class="bg-panel border border-custom p-4 rounded-card flex items-center justify-between shadow-soft">
          <div>
            <span class="text-xs text-muted-custom block font-medium">Couverture du personnel</span>
            <span class="text-sm font-bold font-mono mt-1 block" :class="coverageStatusClass">
              {{ coverageStatusText }}
            </span>
          </div>
          <div class="p-3 rounded-control" :class="coverageStatusBg">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Weekly Grid View -->
      <div v-if="activeView === 'WEEK'" class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft print:bg-white print:border-none print:shadow-none">
        <div v-if="loading" class="p-12 text-center text-xs text-muted-custom">
          Chargement du planning en cours...
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs print:border print:border-slate-400">
            <thead>
              <tr class="bg-panel-raised text-muted-custom border-b border-custom print:bg-slate-200 print:text-slate-900 print:border-slate-400">
                <th class="py-3 px-4 min-w-[220px] font-bold uppercase text-[11px] text-muted-custom print:text-slate-900">Collaborateur</th>
                <th v-for="day in weekDays" :key="day.dateStr" class="py-3 px-3 min-w-[130px] border-l border-custom text-center print:border-slate-400">
                  <div class="font-bold text-main print:text-slate-900">{{ day.dayName }}</div>
                  <div class="text-[11px] font-mono text-brand-strong print:text-slate-700">{{ day.formattedDate }}</div>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-custom text-secondary-custom print:divide-slate-300 print:text-slate-900">
              <tr v-for="emp in employees" :key="emp.id" class="hover:bg-surface-hover transition-colors">
                <!-- Employee Header Column -->
                <td class="py-3 px-4 bg-panel-raised print:bg-slate-50">
                  <div class="font-bold text-main print:text-slate-900">{{ emp.firstName }} {{ emp.lastName }}</div>
                  <div class="text-[10px] text-muted-custom font-mono print:text-slate-600">{{ emp.employeeNumber }}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] font-bold text-brand-strong bg-brand-soft px-1.5 py-0.5 rounded-control border border-brand-soft print:bg-slate-200 print:text-slate-900 print:border-slate-400">
                      {{ getEmployeeWeeklyHours(emp.id).toFixed(1) }} h
                    </span>
                  </div>
                </td>

                <!-- Day Columns -->
                <td
                  v-for="day in weekDays"
                  :key="day.dateStr"
                  @click="openAddShiftModal(emp, day.dateStr)"
                  class="py-2.5 px-2 border-l border-custom align-top cursor-pointer hover:bg-surface-hover transition-colors group relative print:border-slate-300"
                >
                  <!-- Existing Shift Cards for Employee & Date -->
                  <div class="space-y-1.5">
                    <div
                      v-for="shift in getShiftsForCell(emp.id, day.dateStr)"
                      :key="shift.id"
                      @click.stop="openShiftDetails(shift)"
                      class="p-2 rounded-control text-on-brand font-bold text-[11px] shadow-sm border relative transition-transform group-hover:scale-[1.02] print:bg-slate-100 print:text-slate-900 print:border-slate-400"
                      :style="{ backgroundColor: shift.templateColorSnapshot || '#b49c80', borderColor: `${shift.templateColorSnapshot || '#b49c80'}aa` }"
                    >
                      <div class="flex items-center justify-between font-bold">
                        <span>{{ shift.templateNameSnapshot || 'Shift' }}</span>
                        <span class="text-[10px] opacity-80 font-mono">{{ (shift.totalWorkMinutes / 60).toFixed(1) }}h</span>
                      </div>

                      <div v-for="seg in shift.segments" :key="seg.id" class="text-[10px] opacity-90 font-mono mt-0.5">
                        {{ seg.startLocalTime }} – {{ seg.endLocalTime }}{{ seg.endsNextDay ? ' (+1d)' : '' }}
                      </div>

                      <div v-if="shift.position" class="mt-1 text-[9px] uppercase font-extrabold tracking-wider opacity-80 border-t border-black/10 pt-0.5">
                        {{ shift.position.title }}
                      </div>
                    </div>
                  </div>

                  <!-- Hover Plus Indicator -->
                  <div class="hidden group-hover:flex items-center justify-center p-2 border border-dashed border-custom rounded-control text-muted-custom hover:text-main text-[11px] font-bold transition-colors mt-1 print:hidden">
                    + Ajouter
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Monthly Overview Grid View -->
      <div v-else class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-custom pb-3">
          <h3 class="text-xs font-bold text-main uppercase tracking-wider">Vue d'ensemble mensuelle — {{ monthPeriodLabel }}</h3>
          <span class="text-xs text-muted-custom">Cliquez sur un jour pour ouvrir la semaine correspondante</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-panel-raised text-muted-custom border-b border-custom">
                <th class="py-3 px-4 min-w-[200px] font-bold uppercase">Collaborateur</th>
                <th v-for="d in monthDaysCount" :key="d" class="py-2 px-1 text-center min-w-[32px] font-mono border-l border-custom">
                  {{ d }}
                </th>
                <th class="py-3 px-4 text-right font-bold">Total Mois</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-custom text-secondary-custom">
              <tr v-for="emp in employees" :key="emp.id" class="hover:bg-surface-hover transition-colors">
                <td class="py-3 px-4 font-bold text-main">
                  {{ emp.firstName }} {{ emp.lastName }}
                  <span class="block text-[10px] text-muted-custom font-mono font-normal">{{ emp.employeeNumber }}</span>
                </td>

                <td
                  v-for="d in monthDaysCount"
                  :key="d"
                  @click="jumpToDayDate(d)"
                  class="py-2 px-1 text-center border-l border-custom cursor-pointer hover:bg-surface-hover font-mono text-[10px]"
                >
                  <span v-if="hasShiftOnMonthDay(emp.id, d)" class="w-5 h-5 rounded-pill bg-brand-soft text-brand-strong font-bold inline-flex items-center justify-center border border-brand-soft">
                    S
                  </span>
                  <span v-else class="text-muted-custom">•</span>
                </td>

                <td class="py-3 px-4 text-right font-bold text-brand-strong font-mono">
                  {{ getEmployeeMonthlyHours(emp.id).toFixed(1) }} h
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create / Edit Shift Modal -->
    <div v-if="showShiftModal" class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-panel border border-custom rounded-panel w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-custom pb-3">
          <h3 class="text-base font-bold text-main">
            {{ activeShiftId ? 'Modifier / Détails du shift' : 'Ajouter un shift' }}
          </h3>
          <button @click="showShiftModal = false" class="text-muted-custom hover:text-main cursor-pointer">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <div>
            <label class="block text-muted-custom mb-1">Employé</label>
            <input :value="activeEmployeeName" disabled type="text" class="w-full bg-panel-raised border border-custom text-secondary-custom rounded-control px-3 py-2 font-bold" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-muted-custom mb-1">Date</label>
              <input :value="shiftForm.workDate" disabled type="text" class="w-full bg-panel-raised border border-custom text-secondary-custom rounded-control px-3 py-2 font-mono" />
            </div>
            <div>
              <label class="block text-muted-custom mb-1">Poste *</label>
              <select v-model="shiftForm.positionId" class="w-full bg-panel-raised border border-custom text-main rounded-control px-3 py-2">
                <option v-for="pos in positions" :key="pos.id" :value="pos.id">{{ pos.title }}</option>
              </select>
            </div>
          </div>

          <!-- Shift Template Preset -->
          <div>
            <label class="block text-muted-custom mb-1">Modèle de shift prédéfini</label>
            <select v-model="shiftForm.templateId" @change="applyTemplatePreset()" class="w-full bg-panel-raised border border-custom text-main rounded-control px-3 py-2">
              <option value="">-- Créneau personnalisé --</option>
              <option v-for="tmpl in templates" :key="tmpl.id" :value="tmpl.id">{{ tmpl.name }} ({{ tmpl.code }})</option>
            </select>
          </div>

          <!-- Segments Builder -->
          <div class="space-y-3 pt-2 border-t border-custom">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-main">Créneaux du shift</h4>
              <button @click="addShiftSegment()" type="button" class="text-brand-strong hover:underline text-[11px] font-bold cursor-pointer">
                + Ajouter créneau
              </button>
            </div>

            <div v-for="(seg, idx) in shiftForm.segments" :key="idx" class="bg-panel-raised border border-custom p-3 rounded-control space-y-2">
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[10px] text-muted-custom">Début</label>
                  <input v-model="seg.startLocalTime" type="text" placeholder="11:00" class="w-full bg-panel border border-custom text-main rounded-control px-2 py-1 text-center font-mono" />
                </div>
                <div>
                  <label class="block text-[10px] text-muted-custom">Fin</label>
                  <input v-model="seg.endLocalTime" type="text" placeholder="16:00" class="w-full bg-panel border border-custom text-main rounded-control px-2 py-1 text-center font-mono" />
                </div>
                <div class="pt-3">
                  <label class="inline-flex items-center gap-1.5 text-[10px] text-secondary-custom cursor-pointer">
                    <input v-model="seg.endsNextDay" type="checkbox" class="w-3.5 h-3.5 rounded bg-panel border-custom text-brand" />
                    Fin J+1
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div v-if="publishedChangeReasonRequired" class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-control space-y-1.5">
            <label class="block text-amber-600 dark:text-amber-300 font-bold">Motif de modification (Planning Publié) *</label>
            <input v-model="changeReason" type="text" placeholder="Remplacement maladie / Ajustement affluence..." class="w-full bg-panel border border-custom text-main rounded-control px-3 py-2" />
          </div>

          <div v-if="warningConflicts.length > 0" class="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-200 text-xs rounded-control space-y-2">
            <div class="font-bold flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Avertissements de politique RH
            </div>
            <ul class="list-disc pl-5 space-y-1 text-[11px]">
              <li v-for="(w, idx) in warningConflicts" :key="idx">{{ w.message }}</li>
            </ul>
            <div class="flex items-center gap-2 pt-1 border-t border-amber-500/30">
              <input id="overrideWarnings" v-model="overrideWarnings" type="checkbox" class="w-4 h-4 rounded bg-panel border-amber-500 text-amber-500" />
              <label for="overrideWarnings" class="font-bold text-amber-600 dark:text-amber-300 cursor-pointer">Confirmer le dépassement de politique</label>
            </div>
          </div>

          <div v-if="shiftErrorMsg" class="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs rounded-control">
            {{ shiftErrorMsg }}
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-custom">
          <div>
            <button v-if="activeShiftId" @click="cancelShift()" type="button" class="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs rounded-control border border-rose-500/30 cursor-pointer">
              Annuler ce shift
            </button>
          </div>
          <div class="flex items-center gap-3">
            <button @click="showShiftModal = false" class="px-4 py-2 bg-panel hover:bg-surface-hover text-secondary-custom text-xs rounded-control border border-custom cursor-pointer">
              Fermer
            </button>
            <button @click="saveShift()" :disabled="savingShift" class="px-4 py-2 bg-brand text-on-brand hover:bg-brand-strong disabled:opacity-50 font-bold text-xs rounded-control shadow-sm cursor-pointer">
              {{ savingShift ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Publish Confirmation Modal -->
    <div v-if="showPublishModal" class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-panel border border-custom rounded-panel w-full max-w-md p-6 shadow-2xl space-y-4">
        <h3 class="text-base font-bold text-main">Confirmation de publication du planning</h3>
        <p class="text-xs text-muted-custom">
          La publication gèle le planning et notifie le responsable RH. Pour confirmer, veuillez saisir exactement la phrase suivante :
        </p>
        <div class="p-2.5 bg-panel-raised border border-custom rounded-control text-center text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 select-all">
          PUBLIER PLANNING
        </div>
        <input v-model="publishConfirmationText" type="text" placeholder="PUBLIER PLANNING" class="w-full bg-panel-raised border border-custom text-main text-xs rounded-control px-3 py-2 font-mono uppercase focus:outline-none focus:border-emerald-500" />

        <div v-if="publishErrorMsg" class="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs rounded-control">
          {{ publishErrorMsg }}
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-custom">
          <button @click="showPublishModal = false" class="px-4 py-2 bg-panel text-secondary-custom text-xs rounded-control border border-custom cursor-pointer">
            Annuler
          </button>
          <button @click="confirmPublish()" :disabled="publishing" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-control shadow-sm cursor-pointer">
            {{ publishing ? 'Publication...' : 'Confirmer la publication' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Copy Week Modal -->
    <div v-if="showCopyModal" class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-panel border border-custom rounded-panel w-full max-w-md p-6 shadow-2xl space-y-4">
        <h3 class="text-base font-bold text-main">Copier le planning d'une semaine</h3>
        <p class="text-xs text-muted-custom">Dupliquez les shifts de la semaine précédente vers la semaine actuelle.</p>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-muted-custom mb-1">Semaine source (à copier)</label>
            <input v-model="copySourceDate" type="date" class="w-full bg-panel-raised border border-custom text-main rounded-control px-3 py-2 font-mono" />
          </div>
          <div class="flex items-center gap-2 pt-1">
            <input id="overwriteCopy" v-model="copyOverwrite" type="checkbox" class="w-4 h-4 rounded bg-panel border-custom text-brand" />
            <label for="overwriteCopy" class="text-secondary-custom cursor-pointer">Remplacer les shifts existants de la semaine cible</label>
          </div>
        </div>

        <div v-if="copyErrorMsg" class="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs rounded-control">
          {{ copyErrorMsg }}
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-custom">
          <button @click="showCopyModal = false" class="px-4 py-2 bg-panel text-secondary-custom text-xs rounded-control border border-custom cursor-pointer">
            Annuler
          </button>
          <button @click="executeCopyWeek()" :disabled="copying" class="px-4 py-2 bg-brand text-on-brand hover:bg-brand-strong disabled:opacity-50 font-bold text-xs rounded-control shadow-sm cursor-pointer">
            {{ copying ? 'Copie en cours...' : 'Exécuter la copie' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { definePageMeta } from '#imports'
import { formatScheduleStatus, getScheduleStatusBadgeClass } from '~/utils/hrFormatters'

definePageMeta({
  middleware: 'auth',
  layout: 'default'
})

const activeView = ref<'WEEK' | 'MONTH'>('WEEK')
const sites = ref<any[]>([])
const selectedSiteId = ref<string>('')
const currentDate = ref<Date>(new Date())
const schedule = ref<any>(null)
const coverage = ref<any[]>([])
const employees = ref<any[]>([])
const positions = ref<any[]>([])
const templates = ref<any[]>([])
const loading = ref(false)

// Modals state
const showShiftModal = ref(false)
const activeShiftId = ref<string | null>(null)
const activeEmployeeId = ref<string>('')
const activeEmployeeName = ref<string>('')
const publishedChangeReasonRequired = ref(false)
const changeReason = ref('')
const warningConflicts = ref<any[]>([])
const overrideWarnings = ref(false)
const savingShift = ref(false)
const shiftErrorMsg = ref('')

const shiftForm = ref({
  workDate: '',
  positionId: '',
  templateId: '',
  segments: [{ startLocalTime: '08:00', endLocalTime: '17:00', endsNextDay: false, segmentType: 'WORK' }]
})

// Publish Modal
const showPublishModal = ref(false)
const publishConfirmationText = ref('')
const publishing = ref(false)
const publishErrorMsg = ref('')

// Copy Modal
const showCopyModal = ref(false)
const copySourceDate = ref('')
const copyOverwrite = ref(true)
const copying = ref(false)
const copyErrorMsg = ref('')

onMounted(async () => {
  try {
    const [sRes, eRes, pRes] = await Promise.all([
      $fetch<any>('/api/rh/organisation/sites'),
      $fetch<any>('/api/rh/employes'),
      $fetch<any>('/api/rh/organisation/positions')
    ])
    sites.value = sRes.data || []
    employees.value = eRes.data || []
    positions.value = pRes.data || []

    if (sites.value.length > 0) {
      selectedSiteId.value = sites.value[0].id
    }

    const prev = new Date()
    prev.setDate(prev.getDate() - 7)
    copySourceDate.value = prev.toISOString().slice(0, 10)
  } catch (e: any) {
    console.error(e)
  }
})

watch([selectedSiteId, currentDate, activeView], () => {
  loadPlanningData()
})

const activeSiteName = computed(() => {
  const s = sites.value.find(x => x.id === selectedSiteId.value)
  return s ? s.name : ''
})

const activeSiteCode = computed(() => {
  const s = sites.value.find(x => x.id === selectedSiteId.value)
  return s ? s.code : ''
})

const weekDays = computed(() => {
  const d = new Date(currentDate.value)
  const day = d.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(d)
  monday.setUTCDate(d.getUTCDate() + diffToMonday)

  const names = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  const res = []

  for (let i = 0; i < 7; i++) {
    const dateObj = new Date(monday)
    dateObj.setUTCDate(monday.getUTCDate() + i)
    const dateStr = dateObj.toISOString().slice(0, 10)
    res.push({
      dayName: names[i],
      dateStr,
      formattedDate: `${dateObj.getUTCDate()}/${dateObj.getUTCMonth() + 1}`
    })
  }

  return res
})

const monthDaysCount = computed(() => {
  const year = currentDate.value.getUTCFullYear()
  const month = currentDate.value.getUTCMonth()
  return new Date(year, month + 1, 0).getDate()
})

const monthPeriodLabel = computed(() => {
  return currentDate.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

const weekRangeLabel = computed(() => {
  if (weekDays.value.length === 0) return ''
  return `${weekDays.value[0].formattedDate} au ${weekDays.value[6].formattedDate}`
})

const totalPlannedHours = computed(() => {
  if (!schedule.value?.shifts) return 0
  return schedule.value.shifts.reduce((acc: number, s: any) => acc + (s.totalWorkMinutes || 0) / 60, 0)
})

const activeShiftsCount = computed(() => {
  if (!schedule.value?.shifts) return 0
  return schedule.value.shifts.length
})

const coverageStatusText = computed(() => {
  if (coverage.value.length === 0) return 'Non configurée'
  const under = coverage.value.filter(c => c.status === 'UNDERSTAFFED')
  if (under.length > 0) return `${under.length} sous-effectif(s)`
  return 'Couverture optimale'
})

const coverageStatusClass = computed(() => {
  if (coverage.value.length === 0) return 'text-muted-custom'
  const under = coverage.value.filter(c => c.status === 'UNDERSTAFFED')
  if (under.length > 0) return 'text-rose-600 dark:text-rose-400'
  return 'text-emerald-600 dark:text-emerald-400'
})

const coverageStatusBg = computed(() => {
  if (coverage.value.length === 0) return 'bg-panel-raised text-muted-custom'
  const under = coverage.value.filter(c => c.status === 'UNDERSTAFFED')
  if (under.length > 0) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
})

async function loadPlanningData() {
  if (!selectedSiteId.value) return
  loading.value = true
  try {
    const dateStr = currentDate.value.toISOString().slice(0, 10)
    const [pRes, tRes] = await Promise.all([
      $fetch<any>(`/api/rh/planning?siteId=${selectedSiteId.value}&date=${dateStr}`),
      $fetch<any>(`/api/rh/templates?siteId=${selectedSiteId.value}`)
    ])
    schedule.value = pRes.data?.schedule || null
    coverage.value = pRes.data?.coverage || []
    templates.value = tRes.data || []
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function navigatePeriod(step: number) {
  const d = new Date(currentDate.value)
  if (activeView.value === 'WEEK') {
    d.setDate(d.getDate() + step * 7)
  } else {
    d.setMonth(d.getMonth() + step)
  }
  currentDate.value = d
}

function goToday() {
  currentDate.value = new Date()
}

function jumpToDayDate(dayNum: number) {
  const year = currentDate.value.getUTCFullYear()
  const month = currentDate.value.getUTCMonth()
  currentDate.value = new Date(Date.UTC(year, month, dayNum))
  activeView.value = 'WEEK'
}

function getEmployeeWeeklyHours(empId: string): number {
  if (!schedule.value?.shifts) return 0
  return schedule.value.shifts
    .filter((s: any) => s.employeeId === empId)
    .reduce((acc: number, s: any) => acc + (s.totalWorkMinutes || 0) / 60, 0)
}

function getEmployeeMonthlyHours(empId: string): number {
  if (!schedule.value?.shifts) return 0
  return schedule.value.shifts
    .filter((s: any) => s.employeeId === empId)
    .reduce((acc: number, s: any) => acc + (s.totalWorkMinutes || 0) / 60, 0)
}

function hasShiftOnMonthDay(empId: string, dayNum: number): boolean {
  if (!schedule.value?.shifts) return false
  const year = currentDate.value.getUTCFullYear()
  const month = currentDate.value.getUTCMonth()
  const targetStr = new Date(Date.UTC(year, month, dayNum)).toISOString().slice(0, 10)

  return schedule.value.shifts.some((s: any) => {
    const sDate = new Date(s.workDate).toISOString().slice(0, 10)
    return s.employeeId === empId && sDate === targetStr
  })
}

function getShiftsForCell(empId: string, dateStr: string): any[] {
  if (!schedule.value?.shifts) return []
  return schedule.value.shifts.filter((s: any) => {
    const sDate = new Date(s.workDate).toISOString().slice(0, 10)
    return s.employeeId === empId && sDate === dateStr
  })
}

function openAddShiftModal(emp: any, dateStr: string) {
  activeShiftId.value = null
  activeEmployeeId.value = emp.id
  activeEmployeeName.value = `${emp.firstName} ${emp.lastName}`
  publishedChangeReasonRequired.value = schedule.value?.status === 'PUBLISHED'
  changeReason.value = ''
  warningConflicts.value = []
  overrideWarnings.value = false
  shiftErrorMsg.value = ''

  shiftForm.value = {
    workDate: dateStr,
    positionId: positions.value[0]?.id || '',
    templateId: '',
    segments: [{ startLocalTime: '08:00', endLocalTime: '17:00', endsNextDay: false, segmentType: 'WORK' }]
  }

  showShiftModal.value = true
}

function openShiftDetails(shift: any) {
  activeShiftId.value = shift.id
  activeEmployeeId.value = shift.employeeId
  activeEmployeeName.value = shift.employee ? `${shift.employee.firstName} ${shift.employee.lastName}` : 'Employé'
  publishedChangeReasonRequired.value = schedule.value?.status === 'PUBLISHED'
  changeReason.value = ''
  warningConflicts.value = []
  overrideWarnings.value = false
  shiftErrorMsg.value = ''

  shiftForm.value = {
    workDate: new Date(shift.workDate).toISOString().slice(0, 10),
    positionId: shift.positionId,
    templateId: shift.templateId || '',
    segments: shift.segments?.length > 0 ? shift.segments.map((s: any) => ({ ...s })) : [{ startLocalTime: '08:00', endLocalTime: '17:00', endsNextDay: false, segmentType: 'WORK' }]
  }

  showShiftModal.value = true
}

function applyTemplatePreset() {
  if (!shiftForm.value.templateId) return
  const tmpl = templates.value.find(t => t.id === shiftForm.value.templateId)
  if (tmpl && tmpl.segments?.length > 0) {
    shiftForm.value.segments = tmpl.segments.map((s: any) => ({ ...s }))
  }
}

function addShiftSegment() {
  shiftForm.value.segments.push({ startLocalTime: '18:00', endLocalTime: '23:00', endsNextDay: false, segmentType: 'WORK' })
}

async function saveShift() {
  shiftErrorMsg.value = ''
  savingShift.value = true
  try {
    if (activeShiftId.value) {
      if (publishedChangeReasonRequired.value) {
        await $fetch(`/api/rh/shifts/${activeShiftId.value}/change`, {
          method: 'POST',
          body: {
            reason: changeReason.value,
            input: {
              positionId: shiftForm.value.positionId,
              workDate: shiftForm.value.workDate,
              segments: shiftForm.value.segments,
              overrideWarnings: overrideWarnings.value
            }
          }
        })
      }
    } else {
      await $fetch('/api/rh/shifts', {
        method: 'POST',
        body: {
          scheduleId: schedule.value.id,
          employeeId: activeEmployeeId.value,
          siteId: selectedSiteId.value,
          positionId: shiftForm.value.positionId,
          workDate: shiftForm.value.workDate,
          templateId: shiftForm.value.templateId || null,
          segments: shiftForm.value.segments,
          overrideWarnings: overrideWarnings.value
        }
      })
    }
    showShiftModal.value = false
    await loadPlanningData()
  } catch (e: any) {
    if (e.data?.code === 'SCHEDULE_WARNING') {
      warningConflicts.value = e.data?.conflicts || []
    } else {
      shiftErrorMsg.value = e.data?.message || e.message || 'Erreur lors de l’enregistrement.'
    }
  } finally {
    savingShift.value = false
  }
}

async function cancelShift() {
  if (!activeShiftId.value) return
  if (!confirm('Voulez-vous vraiment annuler ce shift ?')) return
  try {
    await $fetch(`/api/rh/shifts/${activeShiftId.value}/cancel`, { method: 'POST' })
    showShiftModal.value = false
    await loadPlanningData()
  } catch (e: any) {
    shiftErrorMsg.value = e.data?.message || 'Erreur lors de l’annulation.'
  }
}

async function confirmPublish() {
  publishErrorMsg.value = ''
  if (publishConfirmationText.value.trim() !== 'PUBLIER PLANNING') {
    publishErrorMsg.value = 'Tapez exactement "PUBLIER PLANNING".'
    return
  }
  publishing.value = true
  try {
    await $fetch(`/api/rh/planning/${schedule.value.id}/publish`, {
      method: 'POST',
      body: { confirmation: publishConfirmationText.value }
    })
    showPublishModal.value = false
    await loadPlanningData()
  } catch (e: any) {
    publishErrorMsg.value = e.data?.message || e.message || 'Erreur lors de la publication.'
  } finally {
    publishing.value = false
  }
}

async function executeCopyWeek() {
  copyErrorMsg.value = ''
  if (!copySourceDate.value) {
    copyErrorMsg.value = 'Veuillez choisir une date dans la semaine source.'
    return
  }
  copying.value = true
  try {
    await $fetch(`/api/rh/planning/${schedule.value.id}/copy-week`, {
      method: 'POST',
      body: {
        siteId: selectedSiteId.value,
        sourcePeriodStart: copySourceDate.value,
        targetPeriodStart: currentDate.value.toISOString().slice(0, 10),
        overwriteExisting: copyOverwrite.value
      }
    })
    showCopyModal.value = false
    await loadPlanningData()
  } catch (e: any) {
    copyErrorMsg.value = e.data?.message || e.message || 'Erreur lors de la copie.'
  } finally {
    copying.value = false
  }
}

function printSchedule() {
  window.print()
}
</script>
