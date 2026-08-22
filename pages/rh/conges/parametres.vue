<template>
  <div class="space-y-6">
    <header><p class="text-xs font-bold uppercase tracking-[.18em] text-brand-strong">Configuration explicite</p><h1 class="mt-1 text-2xl font-bold text-main">Paramètres congés & calendrier</h1><p class="mt-1 max-w-3xl text-xs text-secondary-custom">Définissez vos propres règles internes. Atlas CRM ne préremplit ni droits légaux incertains ni fêtes à date variable.</p></header>
    <div class="grid gap-5 xl:grid-cols-2">
      <form class="panel" @submit.prevent="createType"><div><h2>Créer un type de congé</h2><p>Catégorie, confidentialité documentaire et consommation de solde.</p></div><div class="grid gap-3 sm:grid-cols-2"><input v-model="typeForm.code" required placeholder="Code (ex. CP_INTERNE)" class="input" /><input v-model="typeForm.name" required placeholder="Libellé" class="input" /><select v-model="typeForm.category" class="input"><option value="PAID">Congé payé</option><option value="UNPAID">Congé non payé</option><option value="SICK">Maladie</option><option value="AUTHORIZED_OTHER">Autre absence autorisée</option></select><input v-model="typeForm.color" type="color" class="input h-[42px]" /></div><div class="flex flex-wrap gap-4 text-xs text-secondary-custom"><label><input v-model="typeForm.usesBalance" type="checkbox" /> Utilise un solde</label><label><input v-model="typeForm.requiresDocument" type="checkbox" /> Justificatif requis</label><label><input v-model="typeForm.isPaid" type="checkbox" /> Rémunéré</label></div><button :disabled="activeSubmission !== null" class="submit">{{ activeSubmission === 'type' ? 'Création…' : 'Créer le type' }}</button></form>

      <form class="panel" @submit.prevent="createPolicy"><div><h2>Créer une politique</h2><p>Les droits restent à zéro tant qu’ils ne sont pas explicitement définis.</p></div><select v-model="policyForm.leaveTypeId" required class="input"><option value="">Type de congé</option><option v-for="type in leaveTypes" :key="type.id" :value="type.id">{{ type.name }}</option></select><input v-model="policyForm.name" required placeholder="Nom de la politique" class="input" /><div class="grid gap-3 sm:grid-cols-2"><input v-model="policyForm.effectiveFrom" required type="date" class="input" /><input v-model.number="policyForm.minutesPerDay" required type="number" min="1" class="input" placeholder="Minutes / jour" /><input v-model.number="policyForm.entitlementMinutes" type="number" min="0" class="input" placeholder="Droit initial (minutes)" /><input v-model.number="policyForm.accrualMinutes" type="number" min="0" class="input" placeholder="Acquisition (minutes)" /></div><fieldset><legend class="mb-2 text-xs font-bold uppercase text-muted-custom">Jours ouvrés</legend><div class="flex flex-wrap gap-2"><label v-for="day in weekdays" :key="day.value" class="rounded-pill border border-custom bg-panel-raised px-3 py-1.5 text-xs text-secondary-custom"><input v-model="policyForm.workingWeekdays" :value="day.value" type="checkbox" /> {{ day.label }}</label></div></fieldset><button :disabled="activeSubmission !== null" class="submit">{{ activeSubmission === 'policy' ? 'Création…' : 'Créer la politique' }}</button></form>

      <form class="panel" @submit.prevent="createCalendar"><div><h2>Créer un calendrier</h2><p>Un calendrier par défaut ou affecté à un site.</p></div><div class="grid gap-3 sm:grid-cols-2"><input v-model="calendarForm.code" required placeholder="Code" class="input" /><input v-model="calendarForm.name" required placeholder="Nom" class="input" /></div><label class="text-xs text-secondary-custom"><input v-model="calendarForm.isDefault" type="checkbox" /> Calendrier par défaut du tenant</label><button :disabled="activeSubmission !== null" class="submit">{{ activeSubmission === 'calendar' ? 'Création…' : 'Créer le calendrier' }}</button></form>

      <form class="panel" @submit.prevent="createHoliday"><div><h2>Ajouter un jour férié</h2><p>La date et son caractère ouvré sont confirmés manuellement.</p></div><select v-model="holidayForm.calendarId" required class="input"><option value="">Calendrier</option><option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">{{ calendar.name }}</option></select><div class="grid gap-3 sm:grid-cols-2"><input v-model="holidayForm.localDate" required type="date" class="input" /><input v-model="holidayForm.name" required placeholder="Libellé" class="input" /></div><label class="text-xs text-secondary-custom"><input v-model="holidayForm.isWorkingDay" type="checkbox" /> Journée exceptionnellement ouvrée</label><button :disabled="activeSubmission !== null" class="submit">{{ activeSubmission === 'holiday' ? 'Ajout…' : 'Ajouter la date' }}</button></form>
    </div>
    <p v-if="message" class="rounded-card border border-custom bg-panel-raised p-4 text-xs font-semibold text-main">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Paramètres congés' })
definePageMeta({ middleware: 'auth' })
const { leaveTypes, calendars, fetchTypes, fetchCalendars } = useHrLeave()
const message = ref('')
const activeSubmission = ref<string | null>(null)
const today = new Date().toISOString().slice(0, 10)
const weekdays = [{ value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mer' }, { value: 4, label: 'Jeu' }, { value: 5, label: 'Ven' }, { value: 6, label: 'Sam' }, { value: 0, label: 'Dim' }]
const typeForm = reactive({ code: '', name: '', category: 'PAID', color: '#b49c80', usesBalance: false, requiresDocument: false, isPaid: false })
const policyForm = reactive({ leaveTypeId: '', name: '', effectiveFrom: today, minutesPerDay: 480, entitlementMinutes: 0, accrualMinutes: 0, workingWeekdays: [] as number[], excludeHolidays: true, accrualFrequency: 'MANUAL' })
const calendarForm = reactive({ code: '', name: '', isDefault: false })
const holidayForm = reactive({ calendarId: '', localDate: today, name: '', isWorkingDay: false, isPaid: true })
async function submitOnce(key: string, operation: () => Promise<void>, successMessage: string) {
  if (activeSubmission.value) return
  activeSubmission.value = key
  message.value = ''
  try {
    await operation()
    message.value = successMessage
  } catch (error: any) {
    message.value = error.data?.data?.message || error.data?.message || error.message || 'L’opération n’a pas pu être terminée.'
  } finally {
    activeSubmission.value = null
  }
}
async function createType() { await submitOnce('type', async () => { await $fetch('/api/rh/conges/types', { method: 'POST', body: typeForm }); await fetchTypes() }, 'Type de congé créé.') }
async function createPolicy() { await submitOnce('policy', async () => { await $fetch('/api/rh/conges/policies', { method: 'POST', body: policyForm }); await fetchTypes() }, 'Politique créée.') }
async function createCalendar() { await submitOnce('calendar', async () => { await $fetch('/api/rh/calendriers', { method: 'POST', body: calendarForm }); await fetchCalendars() }, 'Calendrier créé.') }
async function createHoliday() { await submitOnce('holiday', async () => { await $fetch(`/api/rh/calendriers/${holidayForm.calendarId}/jours-feries`, { method: 'POST', body: holidayForm }); await fetchCalendars() }, 'Jour férié ajouté.') }
onMounted(() => Promise.all([fetchTypes(), fetchCalendars()]).catch(() => undefined))
</script>

<style scoped>
.panel { @apply space-y-4 p-5 sm:p-6; border: 1px solid var(--border); border-radius: var(--radius-panel); background: var(--panel); box-shadow: 0 4px 20px -2px rgb(0 0 0 / 5%); }
.panel h2 { @apply text-base font-bold; color: var(--text); }
.panel p { @apply mt-1 text-xs; color: var(--text-muted); }
.input { @apply w-full px-3 py-2.5 text-xs; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--panel-raised); color: var(--text); }
.submit { @apply rounded-full px-4 py-2.5 text-xs font-bold; background: var(--brand); color: var(--on-brand); }
.submit:hover { background: var(--brand-strong); }
.submit:disabled { cursor: not-allowed; opacity: .5; }
</style>
