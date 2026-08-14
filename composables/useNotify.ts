import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message: string
  duration: number // ms (0 = manual dismiss)
  dedupId?: string
  createdAt: number
}

const toastList = ref<ToastItem[]>([])
const MAX_VISIBLE_TOASTS = 4

export function useNotify() {
  function addToast(
    type: ToastType,
    title: string,
    message: string,
    options?: { duration?: number; dedupId?: string }
  ): string {
    const dedupId = options?.dedupId || `${type}:${title}:${message}`

    // Deduplication check: prevent duplicate toasts popping simultaneously
    const existingIndex = toastList.value.findIndex(t => t.dedupId === dedupId)
    if (existingIndex !== -1) {
      // Refresh timer/message of existing toast instead of creating duplicate
      toastList.value[existingIndex].createdAt = Date.now()
      return toastList.value[existingIndex].id
    }

    let defaultDuration = 4000
    if (type === 'error') defaultDuration = 10000
    if (type === 'warning') defaultDuration = 6000
    if (type === 'loading') defaultDuration = 0 // manual dismiss

    const duration = options?.duration !== undefined ? options.duration : defaultDuration
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const newItem: ToastItem = {
      id,
      type,
      title,
      message,
      duration,
      dedupId,
      createdAt: Date.now()
    }

    toastList.value.push(newItem)

    // Enforce max stack size
    if (toastList.value.length > MAX_VISIBLE_TOASTS) {
      toastList.value.shift()
    }

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }

    return id
  }

  function dismiss(id: string) {
    const idx = toastList.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      toastList.value.splice(idx, 1)
    }
  }

  function clearAll() {
    toastList.value = []
  }

  return {
    toasts: toastList,
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
    dismiss,
    clearAll
  }
}
