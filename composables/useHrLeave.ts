import { computed, ref } from 'vue'

export function useHrLeave() {
  const requests = ref<any[]>([])
  const leaveTypes = ref<any[]>([])
  const balances = ref<any[]>([])
  const absences = ref<any[]>([])
  const calendars = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(operation: () => Promise<T>) {
    loading.value = true
    error.value = null
    try {
      return await operation()
    } catch (err: any) {
      error.value = err.data?.data?.message || err.data?.message || 'Les données RH n’ont pas pu être chargées. Réessayez dans quelques instants.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchRequests(params: Record<string, string> = {}) {
    requests.value = await run(() => $fetch<any[]>('/api/rh/conges', { params }))
  }

  async function fetchTypes() {
    leaveTypes.value = await run(() => $fetch<any[]>('/api/rh/conges/types'))
  }

  async function fetchBalances(employeeId?: string) {
    balances.value = await run(() => $fetch<any[]>('/api/rh/conges/balances', { params: employeeId ? { employeeId } : {} }))
  }

  async function fetchAbsences() {
    absences.value = await run(() => $fetch<any[]>('/api/rh/absences'))
  }

  async function fetchCalendars() {
    calendars.value = await run(() => $fetch<any[]>('/api/rh/calendriers'))
  }

  const pendingCount = computed(() => requests.value.filter(request => ['SUBMITTED', 'PENDING_APPROVAL', 'PENDING_MANAGER', 'PENDING_HR', 'CANCEL_REQUESTED'].includes(request.status)).length)
  const approvedCount = computed(() => requests.value.filter(request => request.status === 'APPROVED').length)

  return {
    requests,
    leaveTypes,
    balances,
    absences,
    calendars,
    loading,
    error,
    pendingCount,
    approvedCount,
    fetchRequests,
    fetchTypes,
    fetchBalances,
    fetchAbsences,
    fetchCalendars
  }
}
