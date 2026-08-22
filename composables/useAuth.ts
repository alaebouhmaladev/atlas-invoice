import type { UserPublic, ApiResponse } from '~/types/auth'

export function useAuth() {
  const user = useState<UserPublic | null>('auth:user', () => null)
  const loading = useState<boolean>('auth:loading', () => false)
  const error = useState<string | null>('auth:error', () => null)

  async function fetchUser(): Promise<UserPublic | null> {
    loading.value = true
    error.value = null
    try {
      const headers = useRequestHeaders(['cookie'])
      const response = await $fetch<ApiResponse<{ user: UserPublic }>>('/api/auth/me', {
        headers
      })
      if (response.success && response.data?.user) {
        user.value = response.data.user
        return user.value
      } else {
        user.value = null
        return null
      }
    } catch {
      user.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<ApiResponse<{ user: UserPublic }>>('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })

      if (response.success && response.data?.user) {
        user.value = response.data.user
        return true
      }
      return false
    } catch (err: unknown) {
      const fetchError = err as { data?: { data?: { message?: string }; message?: string } }
      const message = fetchError.data?.data?.message || fetchError.data?.message || 'La connexion a échoué. Vérifiez vos identifiants.'
      error.value = message
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    loading.value = true
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      user.value = null
      loading.value = false
      await navigateTo('/login')
    }
  }

  return {
    user,
    loading,
    error,
    fetchUser,
    login,
    logout
  }
}
