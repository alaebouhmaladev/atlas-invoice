<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-panel border rounded-panel p-4 shadow-2xl transition-all duration-300 flex items-start gap-3"
      :class="type === 'error' ? 'border-rose-500/30 text-rose-600 dark:text-rose-300' : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-300'"
    >
      <div
        class="w-8 h-8 rounded-control flex items-center justify-center shrink-0"
        :class="type === 'error' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
      >
        <svg v-if="type === 'error'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div class="flex-1 text-xs leading-relaxed">
        <strong class="block font-bold text-main mb-0.5">{{ title }}</strong>
        <span>{{ message }}</span>
      </div>

      <button @click="$emit('close')" class="text-muted-custom hover:text-main p-1 cursor-pointer">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue'

const props = defineProps<{
  show: boolean
  title: string
  message: string
  type?: 'success' | 'error'
  duration?: number
}>()

const emit = defineEmits(['close'])

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      setTimeout(() => {
        emit('close')
      }, props.duration || 4000)
    }
  }
)
</script>
