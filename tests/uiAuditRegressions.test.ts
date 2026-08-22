import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

describe('Audit UI — régressions transverses', () => {
  it('n’utilise aucune taille de texte inférieure à 12 px dans les vues', () => {
    const roots = ['components', 'layouts', 'pages'].map(root => join(process.cwd(), root))
    const violations = roots
      .flatMap(filesUnder)
      .filter(path => path.endsWith('.vue'))
      .flatMap((path) => {
        const source = readFileSync(path, 'utf8')
        return /text-\[(?:[0-9]|1[01])px\]|font-size\s*:\s*(?:[0-9]|1[01])px/.test(source)
          ? [path.replace(`${process.cwd()}/`, '')]
          : []
      })

    expect(violations).toEqual([])
    expect(readFileSync(join(process.cwd(), 'assets/css/main.css'), 'utf8')).not.toContain('min-font-size')
  })

  it('conserve les composants de thème partagés sur les jetons sémantiques', () => {
    const sharedFiles = [
      'components/ui/AppModal.vue',
      'components/ui/ConfirmDialog.vue',
      'components/ui/ThemeSwitcher.vue',
      'components/layout/AppSidebar.vue'
    ]

    for (const relativePath of sharedFiles) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')
      expect(source, relativePath).not.toMatch(/(?:bg|text|border|ring)-slate-/)
    }
  })

  it('n’utilise plus les anciennes couleurs de marque codées en dur', () => {
    const roots = ['components', 'layouts', 'pages'].map(root => join(process.cwd(), root))
    const violations = roots
      .flatMap(filesUnder)
      .filter(path => path.endsWith('.vue'))
      .flatMap((path) => {
        const source = readFileSync(path, 'utf8')
        return /\[#(?:b49c80|987d61|d0baa0)\]/i.test(source)
          ? [path.replace(`${process.cwd()}/`, '')]
          : []
      })

    expect(violations).toEqual([])
  })

  it('affiche des solutions de repli françaises pour l’authentification', () => {
    const authComposable = readFileSync(join(process.cwd(), 'composables/useAuth.ts'), 'utf8')
    const authGuard = readFileSync(join(process.cwd(), 'server/utils/auth.ts'), 'utf8')

    expect(authComposable).toContain('La connexion a échoué. Vérifiez vos identifiants.')
    expect(authGuard).toContain('Vous devez être authentifié')
    expect(authGuard).toContain('Vous ne disposez pas des droits nécessaires')
  })

  it('utilise uniquement la route Nuxt existante pour créer un client', () => {
    const navigationFiles = [
      'components/layout/AppContextSidebar.vue',
      'components/layout/AppTopBar.vue'
    ]

    for (const relativePath of navigationFiles) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')
      expect(source, relativePath).not.toContain('/clients/nouveau')
      expect(source, relativePath).toContain('/clients/new')
    }
  })

  it('dirige les alertes de sécurité RH vers la route d’audit existante', () => {
    const permissions = readFileSync(join(process.cwd(), 'server/utils/hrPermissions.ts'), 'utf8')
    expect(permissions).not.toContain("actionUrl: '/admin/audit'")
    expect(permissions).toContain("actionUrl: '/activites'")
  })

  it('affiche les échecs de chargement Phase 5 sans erreur technique brute', () => {
    const composable = readFileSync(join(process.cwd(), 'composables/useHrLeave.ts'), 'utf8')
    expect(composable).not.toContain('err.message')

    for (const relativePath of [
      'pages/rh/conges/index.vue',
      'pages/rh/conges/soldes.vue',
      'pages/rh/absences/index.vue',
      'pages/rh/calendrier/index.vue',
      'pages/rh/conges/[id].vue'
    ]) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8')
      expect(source, relativePath).toContain('role="alert"')
    }
  })
})
