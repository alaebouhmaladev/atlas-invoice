import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useNotify } from '../composables/useNotify'

describe('Toast Lifecycle & Route Navigation Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const { clearAll } = useNotify()
    clearAll()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should preserve Toast across simulated route navigation and expire after normal duration', () => {
    const notify = useNotify()

    // 1. Create client action triggers success Toast
    const toastId = notify.success('Client créé avec succès', 'Le client "Atlas Traiteur" a été créé.')
    expect(notify.toasts.value).toHaveLength(1)
    expect(notify.toasts.value[0].title).toBe('Client créé avec succès')
    expect(notify.toasts.value[0].id).toBe(toastId)

    // 2. Simulate internal route navigation to /clients/123
    // Since toasts use global useState, calling useNotify() on new page returns exact same state
    const notifyOnNewPage = useNotify()
    expect(notifyOnNewPage.toasts.value).toHaveLength(1)
    expect(notifyOnNewPage.toasts.value[0].id).toBe(toastId)

    // 3. Fast-forward timer by 2 seconds - Toast should still be visible
    vi.advanceTimersByTime(2000)
    expect(notifyOnNewPage.toasts.value).toHaveLength(1)

    // 4. Fast-forward timer by remaining duration (total 3500ms) - Toast should expire
    vi.advanceTimersByTime(1600)
    expect(notifyOnNewPage.toasts.value).toHaveLength(0)
  })

  it('should deduplicate identical Toast messages popped rapidly', () => {
    const notify = useNotify()

    notify.success('De nouveau', 'Notification identique', { dedupId: 'unique-action-1' })
    notify.success('De nouveau', 'Notification identique', { dedupId: 'unique-action-1' })

    expect(notify.toasts.value).toHaveLength(1)
  })

  it('should not show success Toast on failed operation', () => {
    const notify = useNotify()

    // Failed creation triggers error toast instead of success
    notify.error('Échec de la création', 'Nom de client obligatoire')

    expect(notify.toasts.value).toHaveLength(1)
    expect(notify.toasts.value[0].type).toBe('error')
    expect(notify.toasts.value[0].title).toBe('Échec de la création')
  })

  it('should support error, warning, info, and loading Toast durations correctly', () => {
    const notify = useNotify()

    notify.error('Erreur Système', 'Validation échouée') // 10s default
    notify.warning('Attention', 'Solde presque dépassé') // 6s default
    notify.info('Information', 'Mise à jour disponible') // 4s default

    expect(notify.toasts.value).toHaveLength(3)

    // After 4.5 seconds, info toast expires
    vi.advanceTimersByTime(4500)
    expect(notify.toasts.value.some(t => t.type === 'info')).toBe(false)
    expect(notify.toasts.value.some(t => t.type === 'warning')).toBe(true)
    expect(notify.toasts.value.some(t => t.type === 'error')).toBe(true)

    // After total 6.5 seconds, warning toast expires
    vi.advanceTimersByTime(2000)
    expect(notify.toasts.value.some(t => t.type === 'warning')).toBe(false)
    expect(notify.toasts.value.some(t => t.type === 'error')).toBe(true)

    // After total 10.5 seconds, error toast expires
    vi.advanceTimersByTime(4000)
    expect(notify.toasts.value).toHaveLength(0)
  })

  it('should allow manually dismissing a Toast', () => {
    const notify = useNotify()

    const id1 = notify.success('First', 'Message 1')
    notify.success('Second', 'Message 2')

    expect(notify.toasts.value).toHaveLength(2)

    notify.dismiss(id1)
    expect(notify.toasts.value).toHaveLength(1)
    expect(notify.toasts.value[0].title).toBe('Second')
  })
})
