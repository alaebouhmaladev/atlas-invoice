import { MODULE_REGISTRY, type ModuleDefinition } from '~/config/modules'

export function useModules() {
  const { user } = useAuth()

  const activeModules = computed<ModuleDefinition[]>(() => {
    const role = user.value?.role || 'ACCOUNTANT'
    return Object.values(MODULE_REGISTRY)
      .filter((mod) => {
        if (!mod.enabled) return false
        if (!mod.requiredRoles || mod.requiredRoles.length === 0) return true
        return mod.requiredRoles.includes(role)
      })
      .sort((a, b) => a.order - b.order)
  })

  return {
    modules: MODULE_REGISTRY,
    activeModules
  }
}
