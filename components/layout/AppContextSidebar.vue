<template>
  <aside class="w-56 bg-sidebar border-r border-custom flex flex-col shrink-0 select-none overflow-y-auto">
    <!-- Active Module Title Header -->
    <div class="h-14 px-4 flex items-center border-b border-custom">
      <span class="text-xs font-extrabold uppercase tracking-widest text-main font-mono">
        {{ currentModuleLabel }}
      </span>
    </div>

    <!-- Contextual Nav Items -->
    <nav class="flex-1 px-3 py-4 space-y-5">
      <div v-for="section in moduleSections" :key="section.title" class="space-y-1">
        <div v-if="section.title" class="px-2 text-xs font-bold text-muted-custom uppercase tracking-wider mb-1.5">
          {{ section.title }}
        </div>

        <NuxtLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          class="flex items-center justify-between px-3 py-2 rounded-control text-xs font-semibold transition-all duration-150"
          :class="isItemActive(item.to) ? 'bg-brand-soft text-brand-strong font-bold border-l-2 border-brand' : 'text-secondary-custom hover:bg-surface-hover hover:text-main'"
        >
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="px-1.5 py-0.5 rounded-pill text-xs font-mono bg-panel border border-custom text-muted-custom">
            {{ item.badge }}
          </span>
        </NuxtLink>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'
import { useAuth } from '~/composables/useAuth'
import { getActiveSidebarTarget } from '~/utils/sidebarNavigation'

const props = defineProps<{
  selectedModule: string
}>()

const route = useRoute()
const { user } = useAuth()

const currentRole = computed(() => user.value?.role || 'ACCOUNTANT')

const currentModuleLabel = computed(() => {
  const map: Record<string, string> = {
    pilotage: 'Pilotage',
    crm: 'CRM',
    facturation: 'Facturation',
    rh: 'Ressources humaines',
    admin: 'Administration'
  }
  return map[props.selectedModule] || 'Navigation'
})

interface NavItem {
  label: string
  to: string
  badge?: string
  roles?: string[]
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const allSections = computed<Record<string, NavSection[]>>(() => ({
  pilotage: [
    {
      title: 'VUE GLOBALE',
      items: [
        { label: 'Tableau de bord', to: '/' },
        { label: 'Activités récentes', to: '/activites', roles: ['SUPER_ADMIN'] }
      ]
    }
  ],
  crm: [
    {
      title: 'CLIENTELE',
      items: [
        { label: 'Tous les clients', to: '/clients' },
        { label: '+ Nouveau client', to: '/clients/new' }
      ]
    }
  ],
  facturation: [
    {
      title: 'DOCUMENTS',
      items: [
        { label: 'Devis', to: '/devis' },
        { label: 'Factures', to: '/factures' }
      ]
    },
    {
      title: 'FINANCES',
      items: [
        { label: 'Paiements & Encaissements', to: '/factures?tab=paiements' }
      ]
    }
  ],
  rh: [
    {
      title: 'GESTION RH',
      items: [
        { label: 'Vue d’ensemble', to: '/rh', roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
        { label: 'Employés', to: '/rh/employes', roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
        { label: 'Organisation et sites', to: '/rh/organisation', roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
        { label: 'Contrats', to: '/rh/contrats', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
        { label: 'Documents RH', to: '/rh/documents', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] }
      ]
    },
    {
      title: 'CONGÉS & ABSENCES',
      items: [
        { label: 'Congés et absences', to: '/rh/conges', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'COMMERCIAL'] },
        { label: 'Approbations', to: '/rh/conges/approbations', roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
        { label: 'Soldes de congés', to: '/rh/conges/soldes', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
        { label: 'Absences détectées', to: '/rh/absences', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
        { label: 'Calendrier férié', to: '/rh/conges/calendrier', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'COMMERCIAL'] },
        { label: 'Paramètres congés', to: '/rh/conges/parametres', roles: ['SUPER_ADMIN', 'HR_MANAGER'] }
      ]
    },
    {
      title: 'PLANNING & POINTAGE',
      items: [
        { label: 'Planning', to: '/rh/planning', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
        { label: 'Pointage', to: '/rh/pointage', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
        { label: 'Présences', to: '/rh/presences', roles: ['SUPER_ADMIN', 'HR_MANAGER', 'ACCOUNTANT'] },
        { label: 'Anomalies', to: '/rh/pointage/anomalies', roles: ['SUPER_ADMIN', 'HR_MANAGER'] },
        { label: 'Corrections', to: '/rh/pointage/corrections', roles: ['SUPER_ADMIN', 'HR_MANAGER'] }
      ]
    }
  ],
  admin: [
    {
      title: 'PARAMETRES SYSTEME',
      items: [
        { label: 'Utilisateurs & Accès', to: '/utilisateurs', roles: ['SUPER_ADMIN'] },
        { label: 'Configuration Générale', to: '/parametres', roles: ['SUPER_ADMIN'] },
        { label: 'Fiche Entreprise', to: '/parametres/entreprise', roles: ['SUPER_ADMIN'] },
        { label: 'Documents & Actifs', to: '/parametres/documents', roles: ['SUPER_ADMIN'] },
        { label: 'Sécurité & Audit', to: '/parametres/securite', roles: ['SUPER_ADMIN'] }
      ]
    }
  ]
}))

const moduleSections = computed(() => {
  const sections = allSections.value[props.selectedModule] || []
  return sections
    .map(s => ({
      ...s,
      items: s.items.filter(i => !i.roles || i.roles.includes(currentRole.value))
    }))
    .filter(s => s.items.length > 0)
})

const activeTarget = computed(() => getActiveSidebarTarget(
  moduleSections.value.flatMap(section => section.items.map(item => item.to)),
  route.path,
  route.query
))

function isItemActive(to: string): boolean {
  return activeTarget.value === to
}
</script>
