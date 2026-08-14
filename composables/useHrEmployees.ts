import { ref } from 'vue'

export interface EmployeeListItem {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  displayName: string
  photoAssetId?: string | null
  phonePrimary: string
  professionalEmail?: string | null
  hireDate: string
  employmentStatus: string
  baseSalary?: number | null
  salaryFormatted?: string
  cinMasked?: string
  ribMasked?: string
  cnssMasked?: string
  linkedUser?: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
  } | null
  version: number
  archivedAt?: string | null
  createdAt: string
}

export interface EmployeeDetail extends EmployeeListItem {
  gender?: string | null
  birthDate?: string | null
  birthPlace?: string | null
  nationality?: string | null
  cin?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  phoneSecondary?: string | null
  personalEmail?: string | null
  emergencyContactName?: string | null
  emergencyContactRelationship?: string | null
  emergencyContactPhone?: string | null
  departureDate?: string | null
  departureReason?: string | null
  salaryCurrency?: string
  paymentMethod?: string | null
  bankName?: string | null
  rib?: string | null
  cnssNumber?: string | null
  internalNotes?: string | null
  createdBy?: { id: string; name: string; email: string }
  updatedBy?: { id: string; name: string; email: string } | null
  archivedBy?: { id: string; name: string; email: string } | null
  archiveReason?: string | null
  activities?: any[]
}

export interface HrMetrics {
  totalActive: number
  onboarding: number
  suspended: number
  departed: number
  archived: number
  newThisMonth: number
}

export function useHrEmployees() {
  const employees = ref<EmployeeListItem[]>([])
  const currentEmployee = ref<EmployeeDetail | null>(null)
  const hrOverview = ref<{ metrics: HrMetrics; recentEmployees: any[]; recentActivities: any[] } | null>(null)

  const pagination = ref({
    page: 1,
    pageSize: 15,
    totalItems: 0,
    totalPages: 1
  })

  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchOverview() {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success: boolean; data: any }>('/api/rh/overview')
      if (res.success && res.data) {
        hrOverview.value = res.data
      }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors du chargement des métriques RH'
    } finally {
      loading.value = false
    }
  }

  async function fetchEmployees(params: {
    page?: number
    pageSize?: number
    search?: string
    status?: string
    includeArchived?: boolean
    linkedStatus?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}) {
    loading.value = true
    error.value = null
    try {
      const queryParams: Record<string, any> = {
        page: params.page || pagination.value.page,
        pageSize: params.pageSize || pagination.value.pageSize
      }

      if (params.search) queryParams.search = params.search
      if (params.status) queryParams.status = params.status
      if (params.includeArchived) queryParams.includeArchived = 'true'
      if (params.linkedStatus) queryParams.linkedStatus = params.linkedStatus
      if (params.sortBy) queryParams.sortBy = params.sortBy
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder

      const res = await $fetch<{ success: boolean; data: EmployeeListItem[]; pagination: any }>('/api/rh/employes', {
        params: queryParams
      })

      if (res.success && res.data) {
        employees.value = res.data
        pagination.value = res.pagination
      }
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors du chargement des employés'
    } finally {
      loading.value = false
    }
  }

  async function fetchEmployeeById(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success: boolean; data: EmployeeDetail }>(`/api/rh/employes/${id}`)
      if (res.success && res.data) {
        currentEmployee.value = res.data
        return res.data
      }
      return null
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Erreur lors de la lecture de la fiche employé'
      return null
    } finally {
      loading.value = false
    }
  }

  async function createEmployee(data: any) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success: boolean; data: EmployeeDetail }>('/api/rh/employes', {
        method: 'POST',
        body: data
      })
      if (res.success && res.data) {
        return { success: true, data: res.data }
      }
      return { success: false, message: 'Erreur lors de la création d’un employé' }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Échec de la création de l’employé'
      error.value = msg
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  async function updateEmployee(id: string, data: any) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success: boolean; data: EmployeeDetail }>(`/api/rh/employes/${id}`, {
        method: 'PUT',
        body: data
      })
      if (res.success && res.data) {
        currentEmployee.value = res.data
        return { success: true, data: res.data }
      }
      return { success: false, message: 'Erreur lors de la mise à jour de l’employé' }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Échec de la modification de l’employé'
      error.value = msg
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  async function archiveEmployee(id: string, reason: string, confirmText: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success: boolean; data: EmployeeDetail }>(`/api/rh/employes/${id}/archive`, {
        method: 'POST',
        body: { reason, confirmText }
      })
      if (res.success && res.data) {
        currentEmployee.value = res.data
        return { success: true, data: res.data }
      }
      return { success: false, message: 'Erreur lors de l’archivage' }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Échec de l’archivage de l’employé'
      error.value = msg
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  async function restoreEmployee(id: string, confirmText: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success: boolean; data: EmployeeDetail }>(`/api/rh/employes/${id}/restore`, {
        method: 'POST',
        body: { confirmText }
      })
      if (res.success && res.data) {
        currentEmployee.value = res.data
        return { success: true, data: res.data }
      }
      return { success: false, message: 'Erreur lors de la restauration' }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Échec de la restauration de l’employé'
      error.value = msg
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  async function linkUserAccount(id: string, userId: string | null, action: 'LINK' | 'UNLINK' = 'LINK') {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success: boolean; data: EmployeeDetail }>(`/api/rh/employes/${id}/link-user`, {
        method: 'POST',
        body: { userId, action }
      })
      if (res.success && res.data) {
        currentEmployee.value = res.data
        return { success: true, data: res.data }
      }
      return { success: false, message: 'Erreur lors du liage utilisateur' }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Échec de la modification du lien utilisateur'
      error.value = msg
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  async function uploadEmployeePhoto(id: string, file: File) {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('photo', file)

      const res = await $fetch<{ success: boolean; data: EmployeeDetail }>(`/api/rh/employes/${id}/photo`, {
        method: 'POST',
        body: formData
      })
      if (res.success && res.data) {
        currentEmployee.value = res.data
        return { success: true, data: res.data }
      }
      return { success: false, message: 'Erreur lors du téléversement de la photo' }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Échec de la mise à jour de la photo'
      error.value = msg
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  async function removeEmployeePhoto(id: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ success: boolean; data: EmployeeDetail }>(`/api/rh/employes/${id}/photo`, {
        method: 'DELETE'
      })
      if (res.success && res.data) {
        currentEmployee.value = res.data
        return { success: true, data: res.data }
      }
      return { success: false, message: 'Erreur lors de la suppression de la photo' }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Échec de la suppression de la photo'
      error.value = msg
      return { success: false, message: msg }
    } finally {
      loading.value = false
    }
  }

  return {
    employees,
    currentEmployee,
    hrOverview,
    pagination,
    loading,
    error,
    fetchOverview,
    fetchEmployees,
    fetchEmployeeById,
    createEmployee,
    updateEmployee,
    archiveEmployee,
    restoreEmployee,
    linkUserAccount,
    uploadEmployeePhoto,
    removeEmployeePhoto
  }
}
