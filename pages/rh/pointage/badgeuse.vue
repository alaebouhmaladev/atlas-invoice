<template>
  <div class="max-w-2xl mx-auto space-y-6 py-6">
    <!-- Main Badge Card -->
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 text-center">
      <!-- Live Clock Display -->
      <div>
        <span class="text-xs font-semibold text-amber-400 uppercase tracking-widest block mb-1">
          Heure Locale Maroc (Africa/Casablanca)
        </span>
        <div class="text-5xl sm:text-6xl font-extrabold text-slate-100 tracking-tight font-mono">
          {{ currentTimeStr }}
        </div>
        <div class="text-sm text-slate-400 mt-2 font-medium">
          {{ currentDateStr }}
        </div>
      </div>

      <!-- Action Status Indicator -->
      <div v-if="latestEvent" class="p-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl">
        <div class="text-xs text-slate-400 font-medium">Dernière Action Enregistrée</div>
        <div class="text-base font-bold text-amber-400 mt-1">
          {{ formatEventType(latestEvent.eventType) }} à {{ latestEvent.localTime }}
        </div>
      </div>

      <!-- Clock Action Buttons Grid -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Clock In -->
        <button
          @click="submitClock('CLOCK_IN')"
          :disabled="loading"
          class="p-5 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-bold rounded-2xl text-base shadow-xl shadow-emerald-900/30 transition-all flex flex-col items-center justify-center gap-2"
        >
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Pointage Entrée
        </button>

        <!-- Clock Out -->
        <button
          @click="submitClock('CLOCK_OUT')"
          :disabled="loading"
          class="p-5 bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white font-bold rounded-2xl text-base shadow-xl shadow-rose-900/30 transition-all flex flex-col items-center justify-center gap-2"
        >
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Pointage Sortie
        </button>

        <!-- Break Start -->
        <button
          @click="submitClock('BREAK_START')"
          :disabled="loading"
          class="p-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-400 font-semibold rounded-2xl text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Début Pause
        </button>

        <!-- Break End -->
        <button
          @click="submitClock('BREAK_END')"
          :disabled="loading"
          class="p-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-indigo-400 font-semibold rounded-2xl text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Fin Pause
        </button>
      </div>

      <!-- User Information -->
      <div class="text-xs text-slate-500 pt-4 border-t border-slate-800 flex items-center justify-between">
        <span>Compte connecté : {{ user?.name }} ({{ user?.role }})</span>
        <span class="text-amber-400 font-medium">Session sécurisée</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()
const { showSuccess, showError } = useNotificationToast()

const currentTimeStr = ref('')
const currentDateStr = ref('')
const loading = ref(false)
const latestEvent = ref<any>(null)

let timer: any = null

function updateClock() {
  const now = new Date()
  currentTimeStr.value = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Casablanca',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now)

  currentDateStr.value = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Casablanca',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(now)
}

function formatEventType(type: string) {
  if (type === 'CLOCK_IN') return 'Entrée'
  if (type === 'BREAK_START') return 'Début Pause'
  if (type === 'BREAK_END') return 'Fin Pause'
  if (type === 'CLOCK_OUT') return 'Sortie'
  return type
}

async function submitClock(eventType: 'CLOCK_IN' | 'BREAK_START' | 'BREAK_END' | 'CLOCK_OUT') {
  loading.value = true
  try {
    const res: any = await $fetch('/api/rh/pointage/action', {
      method: 'POST',
      body: {
        eventType,
        idempotencyKey: `web-${user.value?.id}-${Date.now()}`
      }
    })
    latestEvent.value = res.event
    showSuccess(res.message || 'Pointage enregistré avec succès.')
  } catch (err: any) {
    showError(err.data?.message || err.message || 'Erreur de pointage.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  updateClock()
  timer = setInterval(updateClock, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
