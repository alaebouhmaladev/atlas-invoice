import { ref } from 'vue'

export function usePayments() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const getHeaders = () => useRequestHeaders(['cookie'])

  const addPayment = async (invoiceId: string, payload: any) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: getHeaders(),
        body: payload
      })
      return res.data
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de l\'enregistrement du paiement'
      throw new Error(error.value || 'Erreur paiement')
    } finally {
      loading.value = false
    }
  }

  const reversePayment = async (invoiceId: string, paymentId: string, reason: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>(`/api/invoices/${invoiceId}/payments/${paymentId}/reverse`, {
        method: 'POST',
        headers: getHeaders(),
        body: { reason }
      })
      return res.data
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de l\'annulation du paiement'
      throw new Error(error.value || 'Erreur annulation paiement')
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    addPayment,
    reversePayment
  }
}
