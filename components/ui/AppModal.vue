<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
        @click.self="closeOnBackdrop && $emit('update:modelValue', false)"
      >
        <div
          class="bg-panel rounded-panel border border-custom shadow-soft w-full max-w-lg overflow-hidden transform transition-all"
          :class="maxWidthClass"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="px-6 py-4 border-b border-custom flex items-center justify-between">
            <h3 v-if="title" class="font-bold text-main text-base tracking-tight">{{ title }}</h3>
            <slot name="header" />

            <button
              @click="$emit('update:modelValue', false)"
              type="button"
              class="text-muted-custom hover:text-main p-1 rounded-control transition-colors cursor-pointer"
              aria-label="Fermer la modal"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto max-h-[80vh]">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 py-4 bg-panel-raised border-t border-custom flex items-center justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
    closeOnBackdrop?: boolean
  }>(),
  {
    maxWidth: 'lg',
    closeOnBackdrop: true
  }
)

const emit = defineEmits(['update:modelValue'])

const maxWidthClass = computed(() => {
  switch (props.maxWidth) {
    case 'sm': return 'max-w-sm'
    case 'md': return 'max-w-md'
    case 'xl': return 'max-w-xl'
    case '2xl': return 'max-w-2xl'
    default: return 'max-w-lg'
  }
})

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    emit('update:modelValue', false)
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
