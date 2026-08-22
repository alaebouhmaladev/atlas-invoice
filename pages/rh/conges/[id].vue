<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><NuxtLink to="/rh/conges" class="text-xs font-bold text-brand-strong hover:underline">← Toutes les demandes</NuxtLink><h1 class="mt-3 text-2xl font-bold text-main">Détail de la demande</h1><p class="mt-1 text-xs text-secondary-custom">Décision tracée, planning préservé et présence protégée.</p></div>
      <AppStatusBadge v-if="request" :status="request.status" />
    </header>

    <div v-if="loading" class="rounded-panel border border-custom bg-panel p-12 text-center text-muted-custom">Chargement…</div>
    <div v-else-if="loadError" role="alert" class="rounded-card border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{{ loadError }}</div>
    <template v-else-if="request">
      <div class="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <section class="rounded-panel border border-custom bg-panel p-5 shadow-soft sm:p-6">
          <div class="grid gap-5 sm:grid-cols-2">
            <div><p class="label">Collaborateur</p><p class="value">{{ request.employee.displayName }}</p><p class="subvalue">{{ request.employee.employeeNumber }}</p></div>
            <div><p class="label">Type</p><p class="value"><span class="mr-2 inline-block h-2.5 w-2.5 rounded-pill" :style="{ backgroundColor: request.leaveType.color }" />{{ request.leaveType.name }}</p><p class="subvalue">{{ formatLeaveCategory(request.leaveType.category) }}</p></div>
            <div><p class="label">Période</p><p class="value font-mono">{{ date(request.startDate) }} → {{ date(request.endDate) }}</p></div>
            <div><p class="label">Durée calculée</p><p class="value font-mono">{{ minutes(request.requestedMinutes) }}</p><p class="subvalue">Selon le planning et la politique figés à la soumission</p></div>
          </div>
          <div class="mt-6 border-t border-custom pt-5"><h2 class="text-xs font-bold uppercase tracking-wider text-main">Jours impactés</h2><div class="mt-3 grid gap-2 sm:grid-cols-2"><div v-for="day in request.days" :key="day.id" class="flex items-center justify-between rounded-card border border-custom bg-panel-raised p-3"><div><p class="font-mono text-xs font-bold text-main">{{ date(day.localDate) }}</p><p class="text-xs text-muted-custom">{{ day.site?.name || 'Site non défini' }}</p></div><span class="rounded-pill px-2 py-1 text-xs font-bold" :class="day.isWorkingDay ? 'bg-brand-soft text-brand-strong' : 'bg-surface-muted text-muted-custom'">{{ day.isWorkingDay ? minutes(day.requestedMinutes) : day.holiday?.name || 'Non ouvré' }}</span></div></div></div>
        </section>

        <aside class="space-y-5">
          <section class="rounded-panel border border-custom bg-panel p-5 shadow-soft"><h2 class="text-xs font-bold uppercase tracking-wider text-main">Circuit de validation</h2><div class="mt-4 space-y-3"><div v-for="step in request.approvalSteps" :key="step.id" class="flex gap-3"><span class="mt-1 h-2.5 w-2.5 rounded-pill" :class="step.status === 'APPROVED' ? 'bg-emerald-500' : step.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'" /><div><p class="text-xs font-bold text-main">Étape {{ step.sequence }} · {{ step.approverRole || 'Approbateur désigné' }}</p><p class="text-xs text-muted-custom">{{ formatLeaveApprovalStatus(step.status) }}<span v-if="step.decisionBy"> · {{ step.decisionBy.name }}</span></p></div></div></div></section>
          <section v-if="isPendingDecision" class="rounded-panel border border-brand-soft bg-brand-soft p-5"><h2 class="text-sm font-bold text-main">Décision requise</h2><p class="mt-1 text-xs text-secondary-custom">L’auto-approbation est interdite. Une période de présence validée ou verrouillée bloque la décision.</p><textarea v-model="decisionNote" rows="3" class="mt-4 w-full rounded-control border border-custom bg-panel-raised px-3 py-2 text-xs text-main" placeholder="Note privée de décision (obligatoire en cas de refus)" /><label class="mt-3 block text-xs font-semibold text-secondary-custom">Confirmation d’approbation<input v-model="approvalConfirmation" autocomplete="off" class="mt-1 w-full rounded-control border border-custom bg-panel-raised px-3 py-2 font-mono text-xs text-main" placeholder="APPROUVER LE CONGÉ" /></label><p v-if="actionError" class="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">{{ actionError }}</p><div class="mt-3 grid grid-cols-2 gap-2"><button :disabled="acting" @click="review('REJECTED')" class="rounded-control border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400">Refuser</button><button :disabled="acting || approvalConfirmation !== 'APPROUVER LE CONGÉ'" @click="review('APPROVED')" class="rounded-control bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approuver</button></div></section>
          <section v-if="request.status === 'DRAFT'" class="rounded-panel border border-custom bg-panel p-5 shadow-soft"><h2 class="text-sm font-bold text-main">Brouillon</h2><p class="mt-1 text-xs text-secondary-custom">Soumettez le brouillon lorsque les informations et justificatifs sont prêts.</p><button :disabled="acting" class="mt-3 w-full rounded-control bg-brand px-3 py-2 text-xs font-bold text-on-brand disabled:opacity-50" @click="submitDraft">Soumettre la demande</button></section>
          <section v-if="isWithdrawable || request.status === 'APPROVED'" class="rounded-panel border border-custom bg-panel p-5 shadow-soft"><h2 class="text-sm font-bold text-main">Retrait ou annulation</h2><textarea v-model="actionReason" rows="2" class="mt-3 w-full rounded-control border border-custom bg-panel-raised px-3 py-2 text-xs text-main" placeholder="Motif obligatoire" /><label v-if="request.status === 'APPROVED'" class="mt-3 block text-xs font-semibold text-secondary-custom">Confirmation<input v-model="cancelConfirmation" autocomplete="off" class="mt-1 w-full rounded-control border border-custom bg-panel-raised px-3 py-2 font-mono text-xs text-main" placeholder="ANNULER LE CONGÉ" /></label><button v-if="isWithdrawable" :disabled="acting || actionReason.trim().length < 3" class="mt-3 w-full rounded-control border border-custom px-3 py-2 text-xs font-bold text-main disabled:opacity-50" @click="withdraw">Retirer la demande</button><button v-else :disabled="acting || actionReason.trim().length < 5 || cancelConfirmation !== 'ANNULER LE CONGÉ'" class="mt-3 w-full rounded-control border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50 dark:text-rose-300" @click="requestCancellation">Demander l’annulation</button></section>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import AppStatusBadge from '~/components/ui/AppStatusBadge.vue'
import { formatLeaveApprovalStatus, formatLeaveCategory } from '~/utils/hrLeaveFormatters'
useHead({ title: 'Détail demande de congé' })
definePageMeta({ middleware: 'auth' })
const route = useRoute()
const request = ref<any>(null)
const loading = ref(true)
const acting = ref(false)
const decisionNote = ref('')
const approvalConfirmation = ref('')
const actionReason = ref('')
const cancelConfirmation = ref('')
const actionError = ref('')
const loadError = ref('')
const apiFetch = $fetch as any
async function load() { loading.value = true; loadError.value = ''; try { request.value = await apiFetch(`/api/rh/conges/${route.params.id}`) } catch (error: any) { request.value = null; loadError.value = error.data?.data?.message || error.data?.message || 'La demande n’a pas pu être chargée. Réessayez dans quelques instants.' } finally { loading.value = false } }
const isPendingDecision = computed(() => request.value && ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_MANAGER', 'PENDING_HR'].includes(request.value.status))
const isWithdrawable = computed(() => request.value && ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_MANAGER', 'PENDING_HR'].includes(request.value.status))
async function perform(operation: () => Promise<unknown>) { if (acting.value) return; acting.value = true; actionError.value = ''; try { await operation(); await load() } catch (error: any) { actionError.value = error.data?.data?.message || error.data?.message || error.message || 'L’opération n’a pas pu être enregistrée.' } finally { acting.value = false } }
async function review(decision: 'APPROVED' | 'REJECTED') { if (decision === 'APPROVED' && approvalConfirmation.value !== 'APPROUVER LE CONGÉ') return; await perform(() => apiFetch(`/api/rh/conges/${route.params.id}/review`, { method: 'POST', body: { decision, privateNote: decisionNote.value, confirmation: approvalConfirmation.value, expectedVersion: request.value.version, idempotencyKey: crypto.randomUUID() } })) }
async function submitDraft() { await perform(() => apiFetch(`/api/rh/conges/${route.params.id}/submit`, { method: 'POST', body: { expectedVersion: request.value.version } })) }
async function withdraw() { await perform(() => apiFetch(`/api/rh/conges/${route.params.id}/withdraw`, { method: 'POST', body: { reason: actionReason.value } })) }
async function requestCancellation() { await perform(() => apiFetch(`/api/rh/conges/${route.params.id}/cancel-request`, { method: 'POST', body: { reason: actionReason.value, confirmation: cancelConfirmation.value } })) }
function date(value: string) { return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value)) }
function minutes(value: number) { return value % 60 === 0 ? `${value / 60} h` : `${Math.floor(value / 60)} h ${value % 60}` }
onMounted(() => load())
</script>

<style scoped>
.label { @apply text-xs font-bold uppercase tracking-wider; color: var(--text-muted); }
.value { @apply mt-1 text-sm font-bold; color: var(--text); }
.subvalue { @apply mt-0.5 text-xs; color: var(--text-muted); }
</style>
