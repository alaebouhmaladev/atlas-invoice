<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div class="w-full max-w-md bg-panel border border-custom rounded-panel p-6 shadow-2xl space-y-4">
        <!-- Title & Icon -->
        <div class="flex items-start gap-4">
          <div
            class="w-10 h-10 rounded-control flex items-center justify-center shrink-0"
            :class="danger ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-brand-soft text-brand-strong border border-brand-soft'"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-main">{{ title }}</h3>
            <p class="text-xs text-secondary-custom mt-1 leading-relaxed">{{ message }}</p>
          </div>
        </div>

        <!-- Confirm Match Text Input (for Permanent Delete) -->
        <div v-if="requireMatchText" class="space-y-2 pt-2">
          <label class="block text-xs font-semibold text-secondary-custom">
            Veuillez saisir <strong class="text-brand-strong">{{ requireMatchText }}</strong> pour confirmer :
          </label>
          <input
            ref="confirmationInput"
            v-model="inputMatchText"
            type="text"
            placeholder="Nom pour confirmer"
            class="w-full px-3.5 py-2 bg-panel-raised border border-custom rounded-control text-xs text-main focus:outline-none focus:border-brand"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="$emit('cancel')"
            :disabled="loading"
            class="px-4 py-2 bg-panel-raised hover:bg-surface-hover text-main rounded-control text-xs font-semibold border border-custom transition-colors disabled:opacity-50 cursor-pointer"
          >
            {{ cancelText || 'Annuler' }}
          </button>

          <button
            type="button"
            @click="handleConfirm"
            :disabled="loading || isConfirmDisabled"
            class="px-4 py-2 font-bold rounded-control text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            :class="danger ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20' : 'bg-brand text-on-brand hover:bg-brand-strong'"
          >
            <svg v-if="loading" class="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{{ confirmText || 'Confirmer' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  requireMatchText?: string
}>()

const emit = defineEmits(['confirm', 'cancel'])

const inputMatchText = ref('')
const confirmationInput = ref<HTMLInputElement | null>(null)
const confirmEmitted = ref(false)

const isConfirmDisabled = computed(() => {
  if (confirmEmitted.value) return true
  if (!props.requireMatchText) return false
  return inputMatchText.value.trim() !== props.requireMatchText.trim()
})

function handleConfirm() {
  if (isConfirmDisabled.value || props.loading) return
  confirmEmitted.value = true
  emit('confirm')
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.show && !props.loading) emit('cancel')
}

watch(
  () => props.show,
  async (newVal) => {
    if (newVal) {
      inputMatchText.value = ''
      confirmEmitted.value = false
      await nextTick()
      confirmationInput.value?.focus()
    }
  }
)

watch(
  () => props.loading,
  (loading, previous) => {
    if (previous && !loading && props.show) confirmEmitted.value = false
  }
)

onMounted(() => document.addEventListener('keydown', handleEscape))
onUnmounted(() => document.removeEventListener('keydown', handleEscape))
</script>
