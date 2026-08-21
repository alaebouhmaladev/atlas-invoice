import { ref, watch, onMounted, onUnmounted } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const themeState = ref<ThemeMode>('system')
const isDarkState = ref<boolean>(false)
const isInitialized = ref<boolean>(false)

function applyTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return

  let effectiveDark = false
  if (mode === 'dark') {
    effectiveDark = true
  } else if (mode === 'light') {
    effectiveDark = false
  } else {
    // system
    effectiveDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  isDarkState.value = effectiveDark

  const root = document.documentElement
  if (effectiveDark) {
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
  }
}

export function useTheme() {
  function setTheme(mode: ThemeMode) {
    themeState.value = mode
    applyTheme(mode)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('atlas_theme', mode)
        document.cookie = `atlas_theme=${mode}; path=/; max-age=31536000; SameSite=Lax`
      } catch (err) {
        console.warn('[Theme] Could not persist theme preference:', err)
      }
    }
  }

  function initTheme() {
    if (typeof window === 'undefined' || isInitialized.value) return

    let savedMode: ThemeMode | null = null

    try {
      savedMode = (localStorage.getItem('atlas_theme') as ThemeMode) || null
      if (!savedMode) {
        const match = document.cookie.match(/atlas_theme=(light|dark|system)/)
        if (match) savedMode = match[1] as ThemeMode
      }
    } catch (e) {
      console.warn('[Theme] Error reading saved theme:', e)
    }

    const mode = savedMode || 'system'
    themeState.value = mode
    applyTheme(mode)
    isInitialized.value = true

    // Listen to OS media query changes if in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (themeState.value === 'system') {
        applyTheme('system')
      }
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      mediaQuery.addListener(handleChange)
    }
  }

  return {
    theme: themeState,
    isDark: isDarkState,
    setTheme,
    initTheme
  }
}
