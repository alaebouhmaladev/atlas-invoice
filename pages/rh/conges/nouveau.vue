<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <header>
      <NuxtLink to="/rh/conges" class="text-xs font-bold text-brand-strong hover:underline">← Retour aux demandes</NuxtLink>
      <h1 class="mt-3 text-2xl font-bold text-main">Nouvelle demande de congé</h1>
      <p class="mt-1 text-xs text-secondary-custom">La demande sera soumise pour validation. Les motifs saisis restent réservés aux personnes habilitées.</p>
    </header>

    <div v-if="!leaveTypes.length && !loading" class="rounded-panel border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300">
      Aucun type de congé actif n’est configuré. Configurez d’abord les règles dans <NuxtLink to="/rh/conges/parametres" class="font-bold underline">Paramètres congés</NuxtLink>.
    </div>

    <form class="space-y-5 rounded-panel border border-custom bg-panel p-5 shadow-soft sm:p-7" @submit.prevent="submit(false)">
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1.5"><span class="text-xs font-bold text-main">Collaborateur *</span><select v-model="form.employeeId" required class="w-full rounded-control border border-custom bg-panel-raised px-3 py-2.5 text-sm text-main"><option value="">Sélectionner</option><option v-for="employee in employees" :key="employee.id" :value="employee.id">{{ employee.displayName }} · {{ employee.employeeNumber }}</option></select></label>
        <label class="space-y-1.5"><span class="text-xs font-bold text-main">Type de congé *</span><select v-model="form.leaveTypeId" required class="w-full rounded-control border border-custom bg-panel-raised px-3 py-2.5 text-sm text-main"><option value="">Sélectionner</option><option v-for="type in leaveTypes" :key="type.id" :value="type.id">{{ type.name }}</option></select></label>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1.5"><span class="text-xs font-bold text-main">Date de début *</span><input v-model="form.startDate" required type="date" class="w-full rounded-control border border-custom bg-panel-raised px-3 py-2.5 text-sm text-main" /></label>
        <label class="space-y-1.5"><span class="text-xs font-bold text-main">Date de fin *</span><input v-model="form.endDate" required type="date" class="w-full rounded-control border border-custom bg-panel-raised px-3 py-2.5 text-sm text-main" /></label>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-1.5"><span class="text-xs font-bold text-main">Début</span><select v-model="form.startPortion" class="w-full rounded-control border border-custom bg-panel-raised px-3 py-2.5 text-sm text-main"><option value="FULL_DAY">Journée entière</option><option value="MORNING">Matin</option><option value="AFTERNOON">Après-midi</option><option value="CUSTOM">Plage horaire</option></select></label>
        <label class="space-y-1.5"><span class="text-xs font-bold text-main">Fin</span><select v-model="form.endPortion" class="w-full rounded-control border border-custom bg-panel-raised px-3 py-2.5 text-sm text-main"><option value="FULL_DAY">Journée entière</option><option value="MORNING">Matin</option><option value="AFTERNOON">Après-midi</option><option value="CUSTOM">Plage horaire</option></select></label>
      </div>
      <div v-if="form.startPortion === 'CUSTOM' || form.endPortion === 'CUSTOM'" class="grid gap-4 md:grid-cols-2"><label class="space-y-1.5"><span class="text-xs font-bold text-main">Heure de début</span><input v-model="customStartTime" type="time" class="w-full rounded-control border border-custom bg-panel-raised px-3 py-2.5 text-sm text-main" /></label><label class="space-y-1.5"><span class="text-xs font-bold text-main">Heure de fin</span><input v-model="customEndTime" type="time" class="w-full rounded-control border border-custom bg-panel-raised px-3 py-2.5 text-sm text-main" /></label></div>
      <label class="block space-y-1.5"><span class="text-xs font-bold text-main">Motif confidentiel</span><textarea v-model="form.privateReason" rows="4" maxlength="2000" class="w-full rounded-control border border-custom bg-panel-raised px-3 py-2.5 text-sm text-main" placeholder="Visible uniquement par les personnes disposant de l’habilitation appropriée." /></label>
      <div class="rounded-card border border-custom bg-panel-raised p-4 text-xs text-secondary-custom"><strong class="text-main">Protection des données :</strong> aucun motif privé ni document médical n’apparaît dans les listes, notifications ou vues planning.</div>
      <div v-if="preview" class="rounded-card border border-custom bg-panel-raised p-4 text-xs text-secondary-custom"><strong class="text-main">Aperçu serveur :</strong> {{ minutes(preview.requestedMinutes) }} sur {{ preview.breakdown.length }} jour(s). <span v-if="preview.planningConflicts.length" class="font-bold text-amber-700 dark:text-amber-300">{{ preview.planningConflicts.length }} shift(s) planifié(s) seront signalés sans être supprimés.</span></div>
      <p v-if="message" :class="success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'" class="text-xs font-semibold">{{ message }}</p>
      <div class="flex flex-wrap justify-end gap-2"><button type="button" :disabled="submitting" @click="loadPreview" class="rounded-control border border-custom px-4 py-2.5 text-xs font-bold text-secondary-custom">Calculer l’aperçu</button><button type="button" :disabled="submitting" @click="submit(true)" class="rounded-control border border-custom px-4 py-2.5 text-xs font-bold text-main">Enregistrer le brouillon</button><button :disabled="loading || submitting || !leaveTypes.length" class="rounded-pill bg-brand px-5 py-2.5 text-xs font-bold text-on-brand hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50">{{ submitting ? 'Traitement…' : 'Soumettre la demande' }}</button></div>
    </form>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Nouvelle demande de congé' })
definePageMeta({ middleware: 'auth' })
const { leaveTypes, loading, fetchTypes } = useHrLeave()
const employees = ref<any[]>([])
const message = ref('')
const success = ref(false)
const submitting = ref(false)
const preview = ref<any>(null)
const customStartTime = ref('09:00')
const customEndTime = ref('10:00')
const today = new Date().toISOString().slice(0, 10)
const form = reactive({ employeeId: '', leaveTypeId: '', startDate: today, endDate: today, startPortion: 'FULL_DAY', endPortion: 'FULL_DAY', privateReason: '' })
async function load() {
  await Promise.all([
    fetchTypes(),
    $fetch<any>('/api/rh/employes', { params: { pageSize: 100, status: 'ACTIVE' } }).then(response => { employees.value = response.data || [] })
  ])
}
const toMinute = (value: string) => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes }
const payload = (saveAsDraft = false) => ({ ...form, saveAsDraft, idempotencyKey: crypto.randomUUID(), ...((form.startPortion === 'CUSTOM' || form.endPortion === 'CUSTOM') ? { customStartMinute: toMinute(customStartTime.value), customEndMinute: toMinute(customEndTime.value) } : {}) })
const minutes = (value: number) => `${Math.floor(value / 60)} h ${String(value % 60).padStart(2, '0')}`
async function loadPreview() { message.value = ''; try { preview.value = await $fetch<any>('/api/rh/conges/preview', { method: 'POST', body: payload(false) }) } catch (error: any) { message.value = error.data?.data?.message || error.data?.message || 'L’aperçu n’a pas pu être calculé.' } }
async function submit(saveAsDraft = false) {
  if (submitting.value) return
  submitting.value = true
  message.value = ''
  try {
    const request = await $fetch<any>('/api/rh/conges', { method: 'POST', body: payload(saveAsDraft) })
    success.value = true
    message.value = saveAsDraft ? 'Brouillon enregistré.' : 'Demande soumise avec succès.'
    await navigateTo(`/rh/conges/${request.id}`)
  } catch (error: any) {
    success.value = false
    message.value = error.data?.data?.message || error.data?.message || 'La demande n’a pas pu être enregistrée.'
  } finally {
    submitting.value = false
  }
}
onMounted(() => load().catch(() => undefined))
</script>
