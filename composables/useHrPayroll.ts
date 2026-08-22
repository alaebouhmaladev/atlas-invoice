export interface PayrollPeriodSummary {
  id: string
  periodNumber: string
  name: string
  year: number
  month: number
  status: string
  paymentDate: string
  version: number
  _count: { records: number; variables: number }
}

export const payrollStatusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  CALCULATING: 'Calcul en cours',
  CALCULATED: 'Calculée',
  VALIDATED: 'Validée',
  CLOSED: 'Clôturée',
  REOPENED: 'Rouverte',
  CANCELLED: 'Annulée',
  SUBMITTED: 'Soumise',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  LOCKED: 'Verrouillée',
  UNVERIFIED: 'Non vérifiée',
  VERIFIED: 'Vérifiée',
  EXPIRED: 'Expirée'
}

export function useHrPayroll() {
  const periods = useState<PayrollPeriodSummary[]>('hr-payroll-periods', () => [])
  const loading = ref(false)
  const error = ref<string | null>(null)
  async function loadPeriods() {
    loading.value = true
    error.value = null
    try {
      periods.value = await $fetch<PayrollPeriodSummary[]>('/api/rh/paie/periodes')
    } catch (caught: unknown) {
      error.value =
        (caught as { data?: { message?: string } })?.data?.message || 'Impossible de charger les périodes de paie.'
    } finally {
      loading.value = false
    }
  }
  const formatMoney = (value: string | number | null | undefined) =>
    new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(Number(value || 0))
  const statusLabel = (status: string) => payrollStatusLabels[status] || 'Statut inconnu'
  return { periods, loading, error, loadPeriods, formatMoney, statusLabel }
}
