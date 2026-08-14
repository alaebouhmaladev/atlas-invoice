import { ref } from 'vue'

export interface InvoiceFiltersState {
  search: string
  clientId: string
  status: string
  paymentStatus: string
  overdue: boolean
  source: string
  archiveStatus: string
  issueDateFrom: string
  issueDateTo: string
  dueDateFrom: string
  dueDateTo: string
  page: number
  pageSize: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export function useInvoices() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const invoices = ref<any[]>([])
  const pagination = ref({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1
  })

  const getHeaders = () => useRequestHeaders(['cookie'])

  const fetchInvoices = async (filters: Partial<InvoiceFiltersState> = {}) => {
    loading.value = true
    error.value = null
    try {
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          queryParams.append(key, String(value))
        }
      })

      const res = await $fetch<any>(`/api/invoices?${queryParams.toString()}`, {
        headers: getHeaders()
      })
      if (res.success) {
        invoices.value = res.data.data
        pagination.value = res.data.pagination
      }
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors du chargement des factures'
    } finally {
      loading.value = false
    }
  }

  const fetchInvoice = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>(`/api/invoices/${id}`, {
        headers: getHeaders()
      })
      if (res.success) {
        return res.data.invoice
      }
      return null
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors du chargement de la facture'
      return null
    } finally {
      loading.value = false
    }
  }

  const createInvoice = async (payload: any) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>('/api/invoices', {
        method: 'POST',
        headers: getHeaders(),
        body: payload
      })
      return res.data.invoice
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de la création de la facture'
      throw new Error(error.value || 'Erreur lors de la création')
    } finally {
      loading.value = false
    }
  }

  const updateInvoice = async (id: string, payload: any) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: payload
      })
      return res.data.invoice
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de la mise à jour de la facture'
      throw new Error(error.value || 'Erreur lors de la mise à jour')
    } finally {
      loading.value = false
    }
  }

  const finalizeInvoice = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>(`/api/invoices/${id}/finalize`, {
        method: 'POST',
        headers: getHeaders()
      })
      return res.data.invoice
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de la finalisation'
      throw new Error(error.value || 'Erreur lors de la finalisation')
    } finally {
      loading.value = false
    }
  }

  const cancelInvoice = async (id: string, reason: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>(`/api/invoices/${id}/cancel`, {
        method: 'POST',
        headers: getHeaders(),
        body: { reason }
      })
      return res.data.invoice
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de l\'annulation'
      throw new Error(error.value || 'Erreur lors de l\'annulation')
    } finally {
      loading.value = false
    }
  }

  const archiveInvoice = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>(`/api/invoices/${id}/archive`, {
        method: 'POST',
        headers: getHeaders()
      })
      return res.data.invoice
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de l\'archivage'
      throw new Error(error.value || 'Erreur lors de l\'archivage')
    } finally {
      loading.value = false
    }
  }

  const restoreInvoice = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>(`/api/invoices/${id}/restore`, {
        method: 'POST',
        headers: getHeaders()
      })
      return res.data.invoice
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de la restauration'
      throw new Error(error.value || 'Erreur lors de la restauration')
    } finally {
      loading.value = false
    }
  }

  const deleteInvoice = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      await $fetch<any>(`/api/invoices/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de la suppression'
      throw new Error(error.value || 'Erreur lors de la suppression')
    } finally {
      loading.value = false
    }
  }

  const convertQuoteToInvoice = async (quoteId: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<any>(`/api/quotes/${quoteId}/convert-to-invoice`, {
        method: 'POST',
        headers: getHeaders()
      })
      return res.data.invoice
    } catch (err: any) {
      error.value = err.data?.data?.message || err.message || 'Erreur lors de la conversion du devis'
      throw new Error(error.value || 'Erreur lors de la conversion')
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    invoices,
    pagination,
    fetchInvoices,
    fetchInvoice,
    createInvoice,
    updateInvoice,
    finalizeInvoice,
    cancelInvoice,
    archiveInvoice,
    restoreInvoice,
    deleteInvoice,
    convertQuoteToInvoice
  }
}
