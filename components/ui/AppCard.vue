<template>
  <div class="bg-panel rounded-card border border-custom shadow-soft overflow-hidden transition-all duration-150">
    <div v-if="$slots.header || title" class="px-5 py-4 border-b border-custom flex items-center justify-between">
      <div>
        <h3 v-if="title" class="font-bold text-main text-sm tracking-tight">{{ title }}</h3>
        <p v-if="subtitle" class="text-xs text-muted-custom mt-0.5">{{ subtitle }}</p>
      </div>
      <div>
        <slot name="action" />
      </div>
    </div>

    <div :class="padding ? 'p-5' : ''">
      <slot />
    </div>

    <div v-if="$slots.footer" class="px-5 py-3 bg-panel-raised border-t border-custom flex items-center justify-between text-xs text-muted-custom">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    padding?: boolean
  }>(),
  {
    padding: true
  }
)
</script>
