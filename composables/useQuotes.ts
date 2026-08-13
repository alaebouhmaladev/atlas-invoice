import type { QuoteStatus, DiscountType, QuoteItem } from '@prisma/client'
import type { ApiResponse } from '~/types/auth'
import type { ClientSnapshotData } from '~/server/services/pdf.service'

export interface QuoteWithRelations {
  id: string
  number: string
  sequenceNumber: number
  sequenceYear: number
  clientId: string
  clientSnapshot: ClientSnapshotData
  status: QuoteStatus
  issueDate: string
  validUntil: string
  currency: string
  defaultVatRate?: number | null
  discountType?: DiscountType | null
  discountValue?: string | number | null
  subtotalHt: string | number
  discountAmount: string | number
  totalNetHt: string | number
  totalVat: string | number
  totalTtc: string | number
  subject?: string | null
  paymentTerms?: string | null
  publicNotes?: string | null
  internalNotes?: string | null
  isArchived: boolean
  archivedAt?: string | null
  sentAt?: string | null
  acceptedAt?: string | null
  rejectedAt?: string | null
  expiredAt?: string | null
  convertedAt?: string | null
  createdById: string
  updatedById?: string | null
  createdAt: string
  updatedAt: string
  client?: { id: string; displayName: string; email?: string | null; phone?: string | null }
  items?: QuoteItem[]
  createdBy?: { id: string; name: string; email: string }
  updatedBy?: { id: string; name: string; email: string } | null
}

export interface QuotePaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface QuoteListResponseData {
  data: QuoteWithRelations[]
  pagination: QuotePaginationMeta
}

export function useQuotes() {
  const loading = useState<boolean>('quotes:loading', () => false)
  const error = useState<string | null>('quotes:error', () => null)
  const quotes = useState<QuoteWithRelations[]>('quotes:list', () => [])
  const pagination = useState<QuotePaginationMeta>('quotes:pagination', () => ({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  }))

  async function fetchQuotes(params?: {
    search?: string
    clientId?: string
    status?: QuoteStatus | 'all'
    archiveStatus?: 'active' | 'archived' | 'all'
    issueDateFrom?: string
    issueDateTo?: string
    validUntilFrom?: string
    validUntilTo?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) {
    loading.value = true
    error.value = null
    try {
      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<ApiResponse<QuoteListResponseData>>('/api/quotes', {
        params,
        headers
      })

      if (response.success && response.data) {
        quotes.value = response.data.data
        pagination.value = response.data.pagination
        return response.data
      }
      return null
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      error.value = fetchError.data?.data?.message || fetchError.data?.message || 'Erreur lors du chargement des devis'
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchQuote(id: string): Promise<QuoteWithRelations | null> {
    loading.value = true
    error.value = null
    try {
      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<ApiResponse<{ quote: QuoteWithRelations }>>(`/api/quotes/${id}`, {
        headers
      })
      if (response.success && response.data?.quote) {
        return response.data.quote
      }
      return null
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      error.value = fetchError.data?.data?.message || fetchError.data?.message || 'Erreur lors du chargement du devis'
      return null
    } finally {
      loading.value = false
    }
  }

  async function createQuote(data: Record<string, unknown>): Promise<{ success: boolean; quote?: QuoteWithRelations; message?: string }> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ quote: QuoteWithRelations }>>('/api/quotes', {
        method: 'POST',
        body: data
      })

      if (response.success && response.data?.quote) {
        return { success: true, quote: response.data.quote }
      }
      return { success: false, message: 'Erreur lors de la création du devis' }
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      const message = fetchError.data?.data?.message || fetchError.data?.message || 'Échec de la création du devis'
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  async function updateQuote(id: string, data: Record<string, unknown>): Promise<{ success: boolean; quote?: QuoteWithRelations; message?: string }> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ quote: QuoteWithRelations }>>(`/api/quotes/${id}`, {
        method: 'PATCH',
        body: data
      })

      if (response.success && response.data?.quote) {
        return { success: true, quote: response.data.quote }
      }
      return { success: false, message: 'Erreur lors de la mise à jour du devis' }
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      const message = fetchError.data?.data?.message || fetchError.data?.message || 'Échec de la mise à jour du devis'
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  async function duplicateQuote(id: string): Promise<{ success: boolean; quote?: QuoteWithRelations; message?: string }> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ quote: QuoteWithRelations }>>(`/api/quotes/${id}/duplicate`, {
        method: 'POST'
      })

      if (response.success && response.data?.quote) {
        return { success: true, quote: response.data.quote }
      }
      return { success: false, message: 'Erreur lors de la duplication du devis' }
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      const message = fetchError.data?.data?.message || fetchError.data?.message || 'Échec de la duplication du devis'
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  async function changeStatus(id: string, status: QuoteStatus): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ quote: QuoteWithRelations }>>(`/api/quotes/${id}/status`, {
        method: 'POST',
        body: { status }
      })
      return response.success
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      error.value = fetchError.data?.data?.message || fetchError.data?.message || 'Changement de statut impossible'
      return false
    } finally {
      loading.value = false
    }
  }

  async function archiveQuote(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ quote: QuoteWithRelations }>>(`/api/quotes/${id}/archive`, {
        method: 'POST'
      })
      return response.success
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      error.value = fetchError.data?.data?.message || fetchError.data?.message || "Erreur lors de l'archivage"
      return false
    } finally {
      loading.value = false
    }
  }

  async function restoreQuote(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ quote: QuoteWithRelations }>>(`/api/quotes/${id}/restore`, {
        method: 'POST'
      })
      return response.success
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      error.value = fetchError.data?.data?.message || fetchError.data?.message || 'Erreur lors de la restauration'
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteQuote(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ message: string }>>(`/api/quotes/${id}`, {
        method: 'DELETE'
      })
      return response.success
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      error.value = fetchError.data?.data?.message || fetchError.data?.message || 'Erreur lors de la suppression'
      return false
    } finally {
      loading.value = false
    }
  }

  function downloadPdf(id: string, _filename?: string) {
    if (typeof window !== 'undefined') {
      window.open(`/api/quotes/${id}/pdf`, '_blank')
    }
  }

  return {
    quotes,
    pagination,
    loading,
    error,
    fetchQuotes,
    fetchQuote,
    createQuote,
    updateQuote,
    duplicateQuote,
    changeStatus,
    archiveQuote,
    restoreQuote,
    deleteQuote,
    downloadPdf
  }
}
