<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
    :class="isArchived ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'"
  >
    <span
      class="w-1.5 h-1.5 rounded-full"
      :class="isArchived ? 'bg-amber-400' : 'bg-emerald-400'"
    ></span>
    <span>{{ isArchived ? 'Archivé' : 'Actif' }}</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{
  isArchived: boolean
}>()
</script>
