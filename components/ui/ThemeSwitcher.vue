<template>
  <div class="relative inline-block text-left" ref="dropdownRef">
    <button
      @click="isOpen = !isOpen"
      type="button"
      class="p-2 rounded-xl border border-custom bg-workspace hover:bg-surface-hover text-main transition-colors flex items-center gap-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/50"
      :title="`Thème actuel : ${themeLabel}`"
      aria-label="Sélecteur de thème"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
    >
      <!-- Sun Icon for Light -->
      <svg v-if="theme === 'light'" class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
      <!-- Moon Icon for Dark -->
      <svg v-else-if="theme === 'dark'" class="w-4 h-4 text-brand-strong" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
      <!-- Monitor Icon for System -->
      <svg v-else class="w-4 h-4 text-muted-custom" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>

      <span class="hidden sm:inline text-xs font-semibold">{{ themeLabel }}</span>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute right-0 mt-2 w-36 rounded-xl bg-workspace border border-custom shadow-lg z-50 py-1 space-y-0.5 text-xs font-medium"
      role="menu"
    >
      <button
        @click="selectMode('light')"
        class="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-hover text-main transition-colors"
        :class="{ 'text-brand-strong font-semibold bg-surface-hover': theme === 'light' }"
      >
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Clair
        </span>
        <span v-if="theme === 'light'">✓</span>
      </button>

      <button
        @click="selectMode('dark')"
        class="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-hover text-main transition-colors"
        :class="{ 'text-brand-strong font-semibold bg-surface-hover': theme === 'dark' }"
      >
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          Sombre
        </span>
        <span v-if="theme === 'dark'">✓</span>
      </button>

      <button
        @click="selectMode('system')"
        class="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-hover text-main transition-colors"
        :class="{ 'text-brand-strong font-semibold bg-surface-hover': theme === 'system' }"
      >
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Système
        </span>
        <span v-if="theme === 'system'">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTheme, type ThemeMode } from '~/composables/useTheme'

const { theme, setTheme } = useTheme()
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const themeLabel = computed(() => {
  if (theme.value === 'light') return 'Clair'
  if (theme.value === 'dark') return 'Sombre'
  return 'Système'
})

function selectMode(mode: ThemeMode) {
  setTheme(mode)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
