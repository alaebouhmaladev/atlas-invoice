<template>
  <div class="space-y-6">
    <!-- Top Header Card matching dark/light visual system -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-panel border border-custom p-5 rounded-panel shadow-soft">
      <div class="flex items-center gap-4">
        <NuxtLink to="/rh/planning" class="p-2 rounded-control bg-panel hover:bg-surface-hover text-secondary-custom transition-colors border border-custom">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </NuxtLink>
        <div>
          <h1 class="text-xl font-extrabold text-main tracking-tight">Modèles de shifts et roulements</h1>
          <p class="text-xs text-muted-custom mt-1">Configurez les modèles réutilisables (shifts simples, coupures et repos) par site.</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Site Filter -->
        <select v-model="selectedSiteId" class="bg-panel-raised border border-custom text-main text-xs rounded-control px-3 py-2 focus:outline-none focus:border-brand">
          <option value="">Sélectionnez un site</option>
          <option v-for="site in sites" :key="site.id" :value="site.id">{{ site.name }} ({{ site.code }})</option>
        </select>

        <button
          @click="openModal()"
          :disabled="!selectedSiteId"
          class="px-4 py-2 bg-brand text-on-brand hover:bg-brand-strong disabled:opacity-50 font-bold text-xs rounded-pill shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Créer un modèle
        </button>
      </div>
    </div>

    <!-- Empty Site Selection Notice -->
    <div v-if="!selectedSiteId" class="bg-panel border border-custom p-8 rounded-panel text-center shadow-soft">
      <svg class="w-12 h-12 text-muted-custom mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <h3 class="text-sm font-bold text-main">Veuillez sélectionner un site de travail</h3>
      <p class="text-xs text-muted-custom mt-1">Choisissez un site dans le menu déroulant ci-dessus pour afficher ses modèles de shifts.</p>
    </div>

    <!-- Table of Templates -->
    <div v-else class="bg-panel border border-custom rounded-panel overflow-hidden shadow-soft">
      <div v-if="loading" class="p-8 text-center text-xs text-muted-custom">
        Chargement des modèles de shifts...
      </div>

      <div v-else-if="templates.length === 0" class="p-8 text-center text-xs text-muted-custom">
        Aucun modèle de shift configuré pour ce site. Cliquez sur "Créer un modèle".
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="bg-panel-raised text-muted-custom uppercase tracking-wider font-semibold border-b border-custom">
              <th class="py-3 px-4">Code</th>
              <th class="py-3 px-4">Nom du modèle</th>
              <th class="py-3 px-4">Type</th>
              <th class="py-3 px-4">Créneaux (Segments)</th>
              <th class="py-3 px-4">Statut</th>
              <th class="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-custom text-main">
            <tr v-for="tmpl in templates" :key="tmpl.id" class="hover:bg-surface-hover transition-colors">
              <td class="py-3.5 px-4 font-mono font-bold">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill border" :style="{ backgroundColor: `${tmpl.color}15`, borderColor: `${tmpl.color}40`, color: tmpl.color }">
                  {{ tmpl.code }}
                </span>
              </td>
              <td class="py-3.5 px-4 font-bold text-main">
                {{ tmpl.name }}
                <span v-if="tmpl.description" class="block text-xs text-muted-custom font-normal">{{ tmpl.description }}</span>
              </td>
              <td class="py-3.5 px-4">
                <span v-if="tmpl.isDayOff" class="px-2 py-0.5 bg-panel-raised text-muted-custom border border-custom rounded-pill text-xs font-semibold">
                  REPOS
                </span>
                <span v-else-if="tmpl.segments.length > 1" class="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 rounded-pill text-xs font-semibold">
                  Coupure ({{ tmpl.segments.length }} créneaux)
                </span>
                <span v-else class="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-pill text-xs font-semibold">
                  Shift continu
                </span>
              </td>
              <td class="py-3.5 px-4">
                <div v-if="tmpl.isDayOff" class="text-muted-custom italic">Jour de repos</div>
                <div v-else class="flex flex-wrap gap-1.5">
                  <span
                    v-for="seg in tmpl.segments"
                    :key="seg.id"
                    class="px-2 py-0.5 bg-panel-raised text-main rounded-control text-xs font-mono border border-custom"
                  >
                    {{ seg.startLocalTime }} – {{ seg.endLocalTime }}{{ seg.endsNextDay ? ' (+1d)' : '' }}
                    <span v-if="seg.segmentType === 'PAID_BREAK'" class="text-emerald-600 dark:text-emerald-400 text-xs ml-1 font-sans">(Pause payée)</span>
                    <span v-else-if="seg.segmentType === 'UNPAID_BREAK'" class="text-brand-strong text-xs ml-1 font-sans">(Pause non payée)</span>
                  </span>
                </div>
              </td>
              <td class="py-3.5 px-4">
                <span :class="tmpl.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-panel-raised text-muted-custom border border-custom'" class="px-2.5 py-0.5 rounded-pill text-xs font-bold">
                  {{ tmpl.isActive ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openModal(tmpl)" class="p-1.5 text-muted-custom hover:text-brand-strong hover:bg-surface-hover rounded-control transition-colors cursor-pointer" title="Modifier">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button @click="archive(tmpl.id)" class="p-1.5 text-muted-custom hover:text-rose-600 dark:hover:text-rose-400 hover:bg-surface-hover rounded-control transition-colors cursor-pointer" title="Archiver">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-panel border border-custom rounded-panel w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-custom pb-3">
          <h3 class="text-base font-bold text-main">
            {{ editingId ? 'Modifier le modèle de shift' : 'Créer un nouveau modèle de shift' }}
          </h3>
          <button @click="showModal = false" class="text-muted-custom hover:text-main cursor-pointer">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-muted-custom font-semibold mb-1">Code *</label>
              <input v-model="form.code" :disabled="!!editingId" type="text" placeholder="MATIN / SOIR / COUPURE" class="w-full bg-panel-raised border border-custom text-main rounded-control px-3 py-2 uppercase focus:outline-none focus:border-brand disabled:opacity-50" />
            </div>
            <div>
              <label class="block text-muted-custom font-semibold mb-1">Couleur du badge *</label>
              <div class="flex items-center gap-2">
                <input v-model="form.color" type="color" class="w-9 h-9 bg-panel-raised border border-custom rounded-control p-1 cursor-pointer" />
                <input v-model="form.color" type="text" class="w-full bg-panel-raised border border-custom text-main rounded-control px-3 py-2 focus:outline-none focus:border-brand font-mono" />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-muted-custom font-semibold mb-1">Nom du modèle *</label>
            <input v-model="form.name" type="text" placeholder="Shift Matin / Shift Couverture Soir..." class="w-full bg-panel-raised border border-custom text-main rounded-control px-3 py-2 focus:outline-none focus:border-brand" />
          </div>

          <div>
            <label class="block text-muted-custom font-semibold mb-1">Description (optionnel)</label>
            <input v-model="form.description" type="text" placeholder="Restauration du midi et préparation..." class="w-full bg-panel-raised border border-custom text-main rounded-control px-3 py-2 focus:outline-none focus:border-brand" />
          </div>

          <div class="flex items-center gap-2 pt-1">
            <input id="isDayOff" v-model="form.isDayOff" type="checkbox" class="w-4 h-4 rounded-control bg-panel-raised border-custom text-brand focus:ring-0 cursor-pointer" />
            <label for="isDayOff" class="text-main font-semibold cursor-pointer">Ce modèle correspond à un Jour de Repos (REPOS)</label>
          </div>

          <!-- Segments Builder -->
          <div v-if="!form.isDayOff" class="space-y-3 pt-3 border-t border-custom">
            <div class="flex items-center justify-between">
              <h4 class="font-bold text-main">Créneaux horaires (Segments)</h4>
              <button @click="addSegment()" type="button" class="text-brand-strong hover:underline text-xs font-bold flex items-center gap-1 cursor-pointer">
                + Ajouter un créneau
              </button>
            </div>

            <div v-for="(seg, idx) in form.segments" :key="idx" class="bg-panel-raised border border-custom p-3 rounded-control space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-muted-custom">
                <span>Créneau {{ idx + 1 }}</span>
                <button v-if="form.segments.length > 1" @click="removeSegment(idx)" type="button" class="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">
                  Supprimer
                </button>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label class="block text-xs text-muted-custom">Heure début</label>
                  <input v-model="seg.startLocalTime" type="text" placeholder="11:00" class="w-full bg-panel border border-custom text-main rounded-control px-2 py-1 text-center font-mono focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <label class="block text-xs text-muted-custom">Heure fin</label>
                  <input v-model="seg.endLocalTime" type="text" placeholder="16:00" class="w-full bg-panel border border-custom text-main rounded-control px-2 py-1 text-center font-mono focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <label class="block text-xs text-muted-custom">Type de créneau</label>
                  <select v-model="seg.segmentType" class="w-full bg-panel border border-custom text-main rounded-control px-2 py-1 focus:outline-none focus:border-brand">
                    <option value="WORK">Travail</option>
                    <option value="PAID_BREAK">Pause payée</option>
                    <option value="UNPAID_BREAK">Pause non payée</option>
                  </select>
                </div>
                <div class="flex items-center pt-3">
                  <label class="inline-flex items-center gap-1.5 text-xs text-secondary-custom cursor-pointer">
                    <input v-model="seg.endsNextDay" type="checkbox" class="w-3.5 h-3.5 rounded-control bg-panel border-custom text-brand" />
                    Fin J+1
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="errorMsg" class="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-control font-semibold">
          {{ errorMsg }}
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-custom">
          <button @click="showModal = false" class="px-4 py-2 bg-panel hover:bg-surface-hover text-secondary-custom text-xs rounded-control border border-custom cursor-pointer">
            Annuler
          </button>
          <button @click="save()" :disabled="saving" class="px-4 py-2 bg-brand text-on-brand hover:bg-brand-strong disabled:opacity-50 font-bold text-xs rounded-control shadow-sm cursor-pointer">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const sites = ref<any[]>([])
const selectedSiteId = ref<string>('')
const templates = ref<any[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const errorMsg = ref('')

const form = ref({
  code: '',
  name: '',
  color: '#b49c80',
  description: '',
  isDayOff: false,
  segments: [
    { order: 1, startLocalTime: '08:00', endLocalTime: '17:00', endsNextDay: false, segmentType: 'WORK' }
  ]
})

onMounted(async () => {
  try {
    const res = await $fetch<any>('/api/rh/organisation/sites')
    sites.value = res.data || []
    if (sites.value.length > 0) {
      selectedSiteId.value = sites.value[0].id
    }
  } catch (e: any) {
    console.error(e)
  }
})

watch(selectedSiteId, () => {
  loadTemplates()
})

async function loadTemplates() {
  if (!selectedSiteId.value) return
  loading.value = true
  try {
    const res = await $fetch<any>(`/api/rh/templates?siteId=${selectedSiteId.value}`)
    templates.value = res.data || []
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function openModal(tmpl?: any) {
  errorMsg.value = ''
  if (tmpl) {
    editingId.value = tmpl.id
    form.value = {
      code: tmpl.code,
      name: tmpl.name,
      color: tmpl.color || '#b49c80',
      description: tmpl.description || '',
      isDayOff: tmpl.isDayOff || false,
      segments: tmpl.segments?.length > 0
        ? tmpl.segments.map((s: any) => ({ ...s }))
        : [{ order: 1, startLocalTime: '08:00', endLocalTime: '17:00', endsNextDay: false, segmentType: 'WORK' }]
    }
  } else {
    editingId.value = null
    form.value = {
      code: '',
      name: '',
      color: '#b49c80',
      description: '',
      isDayOff: false,
      segments: [
        { order: 1, startLocalTime: '08:00', endLocalTime: '17:00', endsNextDay: false, segmentType: 'WORK' }
      ]
    }
  }
  showModal.value = true
}

function addSegment() {
  form.value.segments.push({
    order: form.value.segments.length + 1,
    startLocalTime: '18:00',
    endLocalTime: '23:00',
    endsNextDay: false,
    segmentType: 'WORK'
  })
}

function removeSegment(idx: number) {
  form.value.segments.splice(idx, 1)
}

async function save() {
  errorMsg.value = ''
  if (!form.value.code || !form.value.name) {
    errorMsg.value = 'Le code et le nom sont obligatoires.'
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await $fetch(`/api/rh/templates/${editingId.value}`, {
        method: 'PUT',
        body: {
          name: form.value.name,
          color: form.value.color,
          description: form.value.description,
          isDayOff: form.value.isDayOff,
          segments: form.value.isDayOff ? [] : form.value.segments
        }
      })
    } else {
      await $fetch('/api/rh/templates', {
        method: 'POST',
        body: {
          siteId: selectedSiteId.value,
          code: form.value.code,
          name: form.value.name,
          color: form.value.color,
          description: form.value.description,
          isDayOff: form.value.isDayOff,
          segments: form.value.isDayOff ? [] : form.value.segments
        }
      })
    }
    showModal.value = false
    await loadTemplates()
  } catch (e: any) {
    errorMsg.value = e.data?.message || e.message || 'Erreur d’enregistrement.'
  } finally {
    saving.value = false
  }
}

async function archive(id: string) {
  if (!confirm('Voulez-vous vraiment archiver ce modèle de shift ?')) return
  try {
    await $fetch(`/api/rh/templates/${id}/archive`, { method: 'POST' })
    await loadTemplates()
  } catch (e: any) {
    alert(e.data?.message || 'Erreur lors de l’archivage.')
  }
}
</script>
