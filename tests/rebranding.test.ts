import { describe, it, expect } from 'vitest'
import { APP_IDENTITY } from '../config/appIdentity'
import { MODULE_REGISTRY } from '../config/modules'
import packageJson from '../package.json'

describe('Atlas CRM Rebranding & Modular Architecture', () => {
  it('should define central product identity as Atlas CRM', () => {
    expect(APP_IDENTITY.productName).toBe('Atlas CRM')
    expect(APP_IDENTITY.productShortName).toBe('Atlas CRM')
    expect(APP_IDENTITY.productSlug).toBe('atlas-crm')
    expect(APP_IDENTITY.cliName).toBe('atlascrm')
    expect(APP_IDENTITY.copyright).toContain('Atlas CRM')
  })

  it('should define module registry containing core, crm, invoicing, hr, and admin', () => {
    expect(MODULE_REGISTRY.core).toBeDefined()
    expect(MODULE_REGISTRY.crm).toBeDefined()
    expect(MODULE_REGISTRY.invoicing).toBeDefined()
    expect(MODULE_REGISTRY.hr).toBeDefined()
    expect(MODULE_REGISTRY.admin).toBeDefined()

    expect(MODULE_REGISTRY.core.label).toBe('Pilotage')
    expect(MODULE_REGISTRY.crm.label).toBe('CRM')
    expect(MODULE_REGISTRY.invoicing.label).toBe('Facturation')
    expect(MODULE_REGISTRY.hr.label).toBe('Ressources humaines')
    expect(MODULE_REGISTRY.admin.label).toBe('Administration')
  })

  it('should update package.json technical name to atlas-crm', () => {
    expect(packageJson.name).toBe('atlas-crm')
  })
})
