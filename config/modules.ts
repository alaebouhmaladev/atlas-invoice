export interface ModuleDefinition {
  id: string
  label: string
  description: string
  baseRoute: string
  enabled: boolean
  order: number
  requiredRoles?: string[]
}

export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
  core: {
    id: 'core',
    label: 'Pilotage',
    description: 'Tableau de bord, activités et notifications',
    baseRoute: '/',
    enabled: true,
    order: 1
  },
  crm: {
    id: 'crm',
    label: 'CRM',
    description: 'Gestion de la relation client',
    baseRoute: '/clients',
    enabled: true,
    order: 2
  },
  invoicing: {
    id: 'invoicing',
    label: 'Facturation',
    description: 'Devis, factures et paiements',
    baseRoute: '/factures',
    enabled: true,
    order: 3
  },
  hr: {
    id: 'hr',
    label: 'Ressources humaines',
    description: 'Gestion des collaborateurs et effectifs',
    baseRoute: '/rh',
    enabled: true,
    order: 4,
    requiredRoles: ['SUPER_ADMIN', 'HR_MANAGER']
  },
  admin: {
    id: 'admin',
    label: 'Administration',
    description: 'Utilisateurs, sécurité et paramètres',
    baseRoute: '/parametres',
    enabled: true,
    order: 5,
    requiredRoles: ['SUPER_ADMIN']
  }
}
