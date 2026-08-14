<template>
  <Teleport to="body">
    <div
      class="fixed z-50 pointer-events-none flex flex-col gap-2.5 p-4
             top-4 left-1/2 -translate-x-1/2 w-full max-w-sm sm:max-w-md
             sm:top-5 sm:right-5 sm:left-auto sm:translate-x-0"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto w-full bg-slate-900/95 backdrop-blur-md border rounded-2xl p-4 shadow-2xl transition-all duration-300 flex items-start gap-3.5"
          :class="getToastBorderClass(toast.type)"
        >
          <!-- Icon -->
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
            :class="getToastIconClass(toast.type)"
          >
            <!-- Success Icon -->
            <svg v-if="toast.type === 'success'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>

            <!-- Error Icon -->
            <svg v-else-if="toast.type === 'error'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>

            <!-- Warning Icon -->
            <svg v-else-if="toast.type === 'warning'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>

            <!-- Loading Spinner -->
            <svg v-else-if="toast.type === 'loading'" class="animate-spin w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>

            <!-- Info Icon -->
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <!-- Text Body -->
          <div class="flex-1 min-w-0 text-xs leading-relaxed">
            <strong class="block font-bold text-slate-100 mb-0.5 tracking-tight truncate">{{ toast.title }}</strong>
            <span class="text-slate-300 block break-words">{{ toast.message }}</span>
          </div>

          <!-- Close Button -->
          <button
            @click="dismiss(toast.id)"
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Fermer la notification"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useNotify, type ToastType } from '~/composables/useNotify'

const { toasts, dismiss } = useNotify()

function getToastBorderClass(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'border-emerald-500/30 shadow-emerald-950/20'
    case 'error':
      return 'border-rose-500/30 shadow-rose-950/20'
    case 'warning':
      return 'border-amber-500/30 shadow-amber-950/20'
    case 'loading':
      return 'border-blue-500/30 shadow-blue-950/20'
    case 'info':
    default:
      return 'border-slate-700 shadow-slate-950/20'
  }
}

function getToastIconClass(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'error':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'warning':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'loading':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'info':
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700'
  }
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}
</style>
