import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message: string
  duration: number // ms (0 = manual dismiss)
  expiresAt: number | null // Absolute timestamp in ms when toast expires
  dedupId?: string
  createdAt: number
}

const MAX_VISIBLE_TOASTS = 4

// Client-side Map tracking active setTimeout handles by toast ID
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>()

const fallbackToasts = ref<ToastItem[]>([])

export function useNotify() {
  // Global application state persisting across route navigation
  const toasts = typeof useState === 'function'
    ? useState<ToastItem[]>('global-toasts', () => [])
    : fallbackToasts

  function scheduleDismiss(id: string, expiresAt: number | null) {
    if (!expiresAt) return

    // Clear existing timer if already scheduled
    if (activeTimers.has(id)) {
      clearTimeout(activeTimers.get(id)!)
      activeTimers.delete(id)
    }

    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      dismiss(id)
    } else {
      const timer = setTimeout(() => {
        dismiss(id)
      }, remaining)
      activeTimers.set(id, timer)
    }
  }

  function addToast(
    type: ToastType,
    title: string,
    message: string,
    options?: { duration?: number; dedupId?: string }
  ): string {
    const dedupId = options?.dedupId || `${type}:${title}:${message}`

    // Deduplication check: prevent duplicate toasts from popping simultaneously
    const existingIndex = toasts.value.findIndex(t => t.dedupId === dedupId)
    if (existingIndex !== -1) {
      const existing = toasts.value[existingIndex]
      const duration = options?.duration !== undefined ? options.duration : existing.duration
      const expiresAt = duration > 0 ? Date.now() + duration : null
      existing.expiresAt = expiresAt
      scheduleDismiss(existing.id, expiresAt)
      return existing.id
    }

    let defaultDuration = 3500 // 3.5s for success
    if (type === 'error') defaultDuration = 10000
    if (type === 'warning') defaultDuration = 6000
    if (type === 'info') defaultDuration = 4000
    if (type === 'loading') defaultDuration = 0 // manual dismiss

    const duration = options?.duration !== undefined ? options.duration : defaultDuration
    const expiresAt = duration > 0 ? Date.now() + duration : null
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const newItem: ToastItem = {
      id,
      type,
      title,
      message,
      duration,
      expiresAt,
      dedupId,
      createdAt: Date.now()
    }

    toasts.value.push(newItem)

    // Enforce maximum visible toasts limit
    if (toasts.value.length > MAX_VISIBLE_TOASTS) {
      const popped = toasts.value.shift()
      if (popped && activeTimers.has(popped.id)) {
        clearTimeout(activeTimers.get(popped.id)!)
        activeTimers.delete(popped.id)
      }
    }

    scheduleDismiss(id, expiresAt)

    return id
  }

  function dismiss(id: string) {
    if (activeTimers.has(id)) {
      clearTimeout(activeTimers.get(id)!)
      activeTimers.delete(id)
    }
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      toasts.value.splice(idx, 1)
    }
  }

  function clearAll() {
    activeTimers.forEach(timer => clearTimeout(timer))
    activeTimers.clear()
    toasts.value = []
  }

  return {
    toasts,
    success: (title: string, message: string, options?: { duration?: number; dedupId?: string }) =>
      addToast('success', title, message, options),
    error: (title: string, message: string, options?: { duration?: number; dedupId?: string }) =>
      addToast('error', title, message, options),
    warning: (title: string, message: string, options?: { duration?: number; dedupId?: string }) =>
      addToast('warning', title, message, options),
    info: (title: string, message: string, options?: { duration?: number; dedupId?: string }) =>
      addToast('info', title, message, options),
    loading: (title: string, message: string, options?: { duration?: number; dedupId?: string }) =>
      addToast('loading', title, message, options),
    notifySuccess: (message: string, title: string = 'Succès', options?: { duration?: number; dedupId?: string }) =>
      addToast('success', title, message, options),
    notifyError: (message: string, title: string = 'Erreur', options?: { duration?: number; dedupId?: string }) =>
      addToast('error', title, message, options),
    dismiss,
    clearAll
  }
}
