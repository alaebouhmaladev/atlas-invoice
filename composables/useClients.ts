import type { Client, ClientType } from '@prisma/client'
import type { ApiResponse } from '~/types/auth'
import type { PotentialDuplicate } from '~/server/services/client.service'

export interface ClientWithUser extends Client {
  createdBy?: { id: string; name: string; email: string }
  updatedBy?: { id: string; name: string; email: string } | null
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ClientListResponseData {
  data: ClientWithUser[]
  pagination: PaginationMeta
}

export function useClients() {
  const loading = useState<boolean>('clients:loading', () => false)
  const error = useState<string | null>('clients:error', () => null)
  const clients = useState<ClientWithUser[]>('clients:list', () => [])
  const pagination = useState<PaginationMeta>('clients:pagination', () => ({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  }))

  async function fetchClients(params?: {
    search?: string
    type?: ClientType
    city?: string
    status?: 'active' | 'archived' | 'all'
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) {
    loading.value = true
    error.value = null
    try {
      const query = {
        ...params,
        page: params?.page || 1,
        pageSize: params?.pageSize || 20,
        status: params?.status || 'active'
      }

      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<ApiResponse<ClientListResponseData>>('/api/clients', {
        params: query,
        headers
      })

      if (response.success && response.data) {
        clients.value = response.data.data
        pagination.value = response.data.pagination
        return response.data
      }
      return null
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      const message = fetchError.data?.data?.message || fetchError.data?.message || 'Erreur lors du chargement des clients'
      error.value = message
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchClient(id: string): Promise<ClientWithUser | null> {
    loading.value = true
    error.value = null
    try {
      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<ApiResponse<{ client: ClientWithUser }>>(`/api/clients/${id}`, {
        headers
      })
      if (response.success && response.data?.client) {
        return response.data.client
      }
      return null
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      const message = fetchError.data?.data?.message || fetchError.data?.message || 'Erreur lors du chargement des détails du client'
      error.value = message
      return null
    } finally {
      loading.value = false
    }
  }

  async function createClient(data: Record<string, unknown>): Promise<{ success: boolean; duplicateWarning?: boolean; potentialDuplicates?: PotentialDuplicate[]; client?: ClientWithUser; message?: string }> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ duplicateWarning: boolean; potentialDuplicates?: PotentialDuplicate[]; client: ClientWithUser }>>('/api/clients', {
        method: 'POST',
        body: data
      })

      if (response.success && response.data) {
        if (response.data.duplicateWarning) {
          return {
            success: false,
            duplicateWarning: true,
            potentialDuplicates: response.data.potentialDuplicates
          }
        }
        return {
          success: true,
          client: response.data.client
        }
      }
      return { success: false, message: 'Erreur lors de la création du client' }
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      const message = fetchError.data?.data?.message || fetchError.data?.message || 'Échec de la création du client'
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  async function updateClient(id: string, data: Record<string, unknown>): Promise<{ success: boolean; duplicateWarning?: boolean; potentialDuplicates?: PotentialDuplicate[]; client?: ClientWithUser; message?: string }> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ duplicateWarning: boolean; potentialDuplicates?: PotentialDuplicate[]; client: ClientWithUser }>>(`/api/clients/${id}`, {
        method: 'PATCH',
        body: data
      })

      if (response.success && response.data) {
        if (response.data.duplicateWarning) {
          return {
            success: false,
            duplicateWarning: true,
            potentialDuplicates: response.data.potentialDuplicates
          }
        }
        return {
          success: true,
          client: response.data.client
        }
      }
      return { success: false, message: deUpdateMsg(null) }
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      const message = fetchError.data?.data?.message || fetchError.data?.message || 'Échec de la mise à jour du client'
      error.value = message
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  function deUpdateMsg(_val: null): string {
    return 'Erreur lors de la mise à jour'
  }

  async function archiveClient(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ client: ClientWithUser }>>(`/api/clients/${id}/archive`, {
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

  async function restoreClient(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ client: ClientWithUser }>>(`/api/clients/${id}/restore`, {
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

  async function deleteClient(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ message: string }>>(`/api/clients/${id}`, {
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

  return {
    clients,
    pagination,
    loading,
    error,
    fetchClients,
    fetchClient,
    createClient,
    updateClient,
    archiveClient,
    restoreClient,
    deleteClient
  }
}
