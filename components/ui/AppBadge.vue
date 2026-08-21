<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border transition-colors"
    :class="variantClasses"
  >
    <span v-if="dot" class="w-1.5 h-1.5 rounded-full bg-current"></span>
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    dot?: boolean
  }>(),
  {
    variant: 'neutral',
    dot: false
  }
)

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'brand':
      return 'bg-brand-soft text-brand-strong border-brand-soft'
    case 'success':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'warning':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'danger':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    case 'info':
      return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
    default:
      return 'bg-surface-muted text-secondary-custom border-custom'
  }
})
</script>
