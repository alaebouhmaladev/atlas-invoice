<template>
  <div class="w-full overflow-hidden rounded-card border border-custom bg-panel shadow-soft">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs text-main border-collapse">
        <thead class="bg-panel-raised border-b border-custom text-[11px] font-bold text-muted-custom uppercase tracking-wider">
          <slot name="header" />
        </thead>
        <tbody class="divide-y divide-custom">
          <slot />
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-if="empty && !$slots.loading" class="p-8 text-center text-muted-custom">
      <slot name="empty">
        <p class="text-xs">Aucune donnée disponible</p>
      </slot>
    </div>

    <!-- Pagination or Footer -->
    <div v-if="$slots.footer" class="px-5 py-3 border-t border-custom bg-panel-raised">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    empty?: boolean
  }>(),
  {
    empty: false
  }
)
</script>
