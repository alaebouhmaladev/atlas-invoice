export const APP_IDENTITY = {
  productName: 'Atlas CRM',
  productShortName: 'Atlas CRM',
  productSlug: 'atlas-crm',
  description: 'CRM, Facturation et Ressources humaines',
  tagline: 'PLATEFORME DE GESTION',
  version: '1.0.0',
  cliName: 'atlascrm',
  copyright: 'Atlas CRM • v1.0.0'
} as const

export type AppIdentity = typeof APP_IDENTITY
