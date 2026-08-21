<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-bold rounded-control transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-none cursor-pointer"
    :class="[sizeClasses, variantClasses, block ? 'w-full' : '']"
    v-bind="$attrs"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <slot name="icon-left" />
    <slot />
    <slot name="icon-right" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'submit' | 'reset'
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  {
    type: 'button',
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    block: false
  }
)

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-3 py-1.5 text-xs gap-1.5'
    case 'lg':
      return 'px-5 py-2.5 text-sm gap-2.5'
    default:
      return 'px-4 py-2 text-xs gap-2'
  }
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-panel border border-custom hover:bg-surface-hover text-main shadow-sm'
    case 'outline':
      return 'bg-transparent border border-custom hover:bg-surface-hover text-main shadow-sm'
    case 'ghost':
      return 'bg-transparent hover:bg-surface-hover text-secondary-custom'
    case 'destructive':
      return 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20'
    default:
      // Primary: Atlas Bites Bronze identity (#b49c80)
      return 'bg-brand text-on-brand hover:bg-brand-strong font-bold shadow-sm'
  }
})
</script>
