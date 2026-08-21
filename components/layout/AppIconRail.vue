<template>
  <aside class="w-16 bg-rail border-r border-custom flex flex-col items-center py-4 justify-between shrink-0 select-none">
    <!-- Top Module Icons -->
    <div class="flex flex-col items-center space-y-3 w-full">
      <!-- Atlas Bites Logo Mark -->
      <NuxtLink to="/" class="w-10 h-10 rounded-2xl bg-brand text-slate-950 font-extrabold flex items-center justify-center shadow-sm text-xs tracking-tighter mb-2 hover:scale-105 transition-transform" title="Atlas CRM — Atlas Bites SARL">
        AB
      </NuxtLink>

      <!-- Modules Nav Icons -->
      <button
        v-for="mod in activeModules"
        :key="mod.id"
        @click="$emit('select-module', mod.id)"
        class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all relative group cursor-pointer"
        :class="selectedModule === mod.id ? 'bg-brand text-slate-950 shadow-sm font-bold scale-105' : 'text-secondary-custom hover:bg-surface-hover hover:text-main'"
        :title="mod.label"
      >
        <component :is="mod.icon" class="w-5 h-5" />
        
        <!-- Tooltip -->
        <span class="absolute left-14 bg-panel border border-custom text-main text-xs font-semibold px-2.5 py-1 rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
          {{ mod.label }}
        </span>
      </button>
    </div>

    <!-- Bottom Actions (Help / Settings / Theme) -->
    <div class="flex flex-col items-center space-y-3 w-full pt-4 border-t border-custom">
      <NuxtLink
        to="/parametres"
        class="w-10 h-10 rounded-2xl flex items-center justify-center text-secondary-custom hover:bg-surface-hover hover:text-main transition-colors relative group"
        title="Paramètres"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        </svg>
        <span class="absolute left-14 bg-panel border border-custom text-main text-xs font-semibold px-2.5 py-1 rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
          Paramètres
        </span>
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { h, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'

defineProps<{
  selectedModule: string
}>()

defineEmits(['select-module'])

const { user } = useAuth()

const IconPilotage = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' })
])

const IconCrm = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' })
])

const IconFacturation = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
])

const IconRh = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
])

const IconAdmin = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' })
])

const allModules = [
  { id: 'pilotage', label: 'Pilotage', icon: IconPilotage },
  { id: 'crm', label: 'CRM', icon: IconCrm },
  { id: 'facturation', label: 'Facturation', icon: IconFacturation },
  { id: 'rh', label: 'Ressources humaines', icon: IconRh, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
  { id: 'admin', label: 'Administration', icon: IconAdmin, roles: ['SUPER_ADMIN'] }
]

const activeModules = computed(() => {
  const currentRole = user.value?.role || 'ACCOUNTANT'
  return allModules.filter(m => !m.roles || m.roles.includes(currentRole))
})
</script>
