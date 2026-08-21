<template>
  <div>
    <!-- Mobile Backdrop -->
    <div
      v-if="mobileOpen"
      @click="$emit('close-mobile')"
      class="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden"
    ></div>

    <!-- Sidebar Container -->
    <aside
      class="fixed top-0 bottom-0 left-0 z-50 w-64 bg-sidebar border-r border-custom flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0"
      :class="mobileOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Brand Logo Header -->
      <div class="h-16 px-5 flex items-center justify-between border-b border-custom">
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <div class="w-9 h-9 rounded-xl bg-brand text-on-brand font-extrabold flex items-center justify-center shadow-sm text-sm tracking-tighter">
            AB
          </div>
          <div>
            <span class="font-bold text-main tracking-tight text-base block leading-tight group-hover:text-brand transition-colors">Atlas CRM</span>
            <span class="text-[9px] text-muted-custom font-semibold uppercase tracking-wider block">Atlas Bites SARL</span>
          </div>
        </NuxtLink>

        <button
          @click="$emit('close-mobile')"
          class="lg:hidden text-muted-custom hover:text-main p-1.5 rounded-lg transition-colors"
          aria-label="Fermer le menu"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation Groups -->
      <nav class="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div v-for="group in filteredNavGroups" :key="group.title" class="space-y-1">
          <div class="px-3 text-[10px] font-semibold text-muted-custom uppercase tracking-widest mb-1.5">
            {{ group.title }}
          </div>

          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
            :class="isItemActive(item.to) ? 'bg-[#b49c80]/15 text-[#987d61] dark:text-[#d0baa0] font-semibold border-l-2 border-[#b49c80]' : 'text-secondary-custom hover:bg-surface-hover hover:text-main'"
          >
            <div class="flex items-center gap-3">
              <component :is="item.icon" class="w-5 h-5" />
              <span>{{ item.label }}</span>
            </div>
          </NuxtLink>
        </div>
      </nav>

      <!-- Footer Info -->
      <div class="p-4 border-t border-custom text-xs text-muted-custom text-center">
        {{ identity.copyright }}
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { h, computed } from 'vue'
import { useRoute } from '#imports'
import { useAppIdentity } from '~/composables/useAppIdentity'
import { useAuth } from '~/composables/useAuth'

defineProps<{
  mobileOpen: boolean
}>()

defineEmits(['close-mobile'])

const route = useRoute()
const { user } = useAuth()
const identity = useAppIdentity()

// Icon render helpers using inline SVG components
const IconDashboard = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' })
])

const IconActivities = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' })
])

const IconNotifications = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' })
])

const IconClients = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' })
])

const IconQuotes = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
])

const IconInvoices = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' })
])

const IconPayments = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 8v2m0-8c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
])

const IconHrOverview = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
])

const IconEmployees = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-4 0h4' })
])

const IconUsers = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
])

const IconSettings = () => h('svg', { class: 'w-5 h-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
])

interface NavItem {
  label: string
  to: string
  icon: any
  roles?: string[]
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups = computed<NavGroup[]>(() => [
  {
    title: 'PILOTAGE',
    items: [
      { label: 'Tableau de bord', to: '/', icon: IconDashboard },
      { label: 'Activités', to: '/activites', icon: IconActivities, roles: ['SUPER_ADMIN'] },
      { label: 'Notifications', to: '/notifications', icon: IconNotifications }
    ]
  },
  {
    title: 'CRM',
    items: [
      { label: 'Clients', to: '/clients', icon: IconClients }
    ]
  },
  {
    title: 'FACTURATION',
    items: [
      { label: 'Devis', to: '/devis', icon: IconQuotes },
      { label: 'Factures', to: '/factures', icon: IconInvoices },
      { label: 'Paiements', to: '/factures?tab=paiements', icon: IconPayments }
    ]
  },
  {
    title: 'RESSOURCES HUMAINES',
    items: [
      { label: 'Vue d’ensemble', to: '/rh', icon: IconHrOverview, roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
      { label: 'Employés', to: '/rh/employes', icon: IconEmployees, roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
      { label: 'Organisation', to: '/rh/organisation', icon: IconHrOverview, roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
      { label: 'Contrats', to: '/rh/contrats', icon: IconQuotes, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
      { label: 'Documents', to: '/rh/documents', icon: IconActivities, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
      { label: 'Planning', to: '/rh/planning', icon: IconActivities, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
      { label: 'Pointage', to: '/rh/pointage', icon: IconActivities, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
      { label: 'Présences', to: '/rh/presences', icon: IconActivities, roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
      { label: 'Anomalies', to: '/rh/pointage/anomalies', icon: IconActivities, roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
      { label: 'Corrections', to: '/rh/pointage/corrections', icon: IconActivities, roles: ['SUPER_ADMIN', 'HR_MANAGER'] }
    ]
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { label: 'Utilisateurs', to: '/utilisateurs', icon: IconUsers, roles: ['SUPER_ADMIN'] },
      { label: 'Paramètres', to: '/parametres', icon: IconSettings, roles: ['SUPER_ADMIN'] }
    ]
  }
])

const filteredNavGroups = computed(() => {
  const currentRole = user.value?.role || 'ACCOUNTANT'
  return navGroups.value
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(currentRole))
    }))
    .filter((group) => group.items.length > 0)
})

function isItemActive(to: string): boolean {
  const currentPath = route.path
  if (to === '/') return currentPath === '/'
  if (to.includes('?')) {
    const basePath = to.split('?')[0]
    return currentPath === basePath && route.query.tab === 'paiements'
  }
  return currentPath.startsWith(to) && route.query.tab !== 'paiements'
}
</script>
