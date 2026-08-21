<template>
  <div class="min-h-[85vh] flex items-center justify-center py-6 px-4">
    <div class="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-center">
      <!-- Terminal Welcome Header -->
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded-full mb-3">
          BORNE DE POINTAGE TABLETTE
        </div>
        <h1 class="text-3xl font-extrabold text-slate-100 tracking-tight">Atlas CRM Pointage</h1>
        <p class="text-sm text-slate-400 mt-1">Veuillez saisir le code de la borne et votre identifiant/PIN.</p>
      </div>

      <!-- Feedback Banner -->
      <div v-if="feedback" :class="feedback.isError ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'" class="p-4 border rounded-2xl text-sm font-semibold transition-all">
        {{ feedback.message }}
      </div>

      <!-- Terminal Input Form -->
      <form @submit.prevent="submitTerminalClock" class="space-y-4 text-left">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Code Borne Tablette</label>
          <input
            v-model="terminalCode"
            type="text"
            required
            placeholder="Ex: TERM-REST-01"
            class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Secret / PIN Borne</label>
          <input
            v-model="terminalSecret"
            type="password"
            required
            placeholder="••••••••"
            class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Matricule Employé ou PIN Collaborateur</label>
          <input
            v-model="employeeInput"
            type="text"
            required
            placeholder="Ex: EMP-2026-0001 ou Code PIN"
            class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 font-mono text-center tracking-widest text-lg font-bold"
          />
        </div>

        <!-- Action Selection Buttons -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            @click="selectedAction = 'CLOCK_IN'"
            :class="selectedAction === 'CLOCK_IN' ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700'"
            class="py-3 px-4 rounded-xl text-sm font-semibold border transition-all"
          >
            Entrée
          </button>
          <button
            type="button"
            @click="selectedAction = 'CLOCK_OUT'"
            :class="selectedAction === 'CLOCK_OUT' ? 'bg-rose-500 text-slate-950 font-bold border-rose-400' : 'bg-slate-800 text-slate-300 border-slate-700'"
            class="py-3 px-4 rounded-xl text-sm font-semibold border transition-all"
          >
            Sortie
          </button>
          <button
            type="button"
            @click="selectedAction = 'BREAK_START'"
            :class="selectedAction === 'BREAK_START' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'"
            class="py-3 px-4 rounded-xl text-sm font-semibold border transition-all"
          >
            Début Pause
          </button>
          <button
            type="button"
            @click="selectedAction = 'BREAK_END'"
            :class="selectedAction === 'BREAK_END' ? 'bg-indigo-500 text-slate-950 font-bold border-indigo-400' : 'bg-slate-800 text-slate-300 border-slate-700'"
            class="py-3 px-4 rounded-xl text-sm font-semibold border transition-all"
          >
            Fin Pause
          </button>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-base transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 mt-4"
        >
          Valider le Pointage Borne
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const terminalCode = ref('')
const terminalSecret = ref('')
const employeeInput = ref('')
const selectedAction = ref<'CLOCK_IN' | 'BREAK_START' | 'BREAK_END' | 'CLOCK_OUT'>('CLOCK_IN')
const loading = ref(false)
const feedback = ref<{ message: string; isError: boolean } | null>(null)

let autoResetTimer: any = null

async function submitTerminalClock() {
  loading.value = true
  feedback.value = null
  try {
    const res: any = await $fetch('/api/rh/pointage/terminal/clock', {
      method: 'POST',
      body: {
        terminalCode: terminalCode.value,
        terminalSecretOrPin: terminalSecret.value,
        employeeNumberOrPin: employeeInput.value,
        eventType: selectedAction.value,
        idempotencyKey: `term-${terminalCode.value}-${Date.now()}`
      }
    })

    feedback.value = {
      message: res.message,
      isError: false
    }
    employeeInput.value = ''

    // Reset feedback after 5 seconds idle
    if (autoResetTimer) clearTimeout(autoResetTimer)
    autoResetTimer = setTimeout(() => {
      feedback.value = null
    }, 5000)
  } catch (err: any) {
    feedback.value = {
      message: err.data?.message || err.message || 'Erreur de pointage sur la borne.',
      isError: true
    }
  } finally {
    loading.value = false
  }
}
</script>
