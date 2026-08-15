import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import path from 'node:path'

describe('Atlas CRM CLI Launcher Tests', () => {
  const projectDir = process.cwd()
  const cliScript = path.join(projectDir, 'scripts', 'atlascrm')

  it('should display help message with atlascrm help', () => {
    const output = execSync(`"${cliScript}" help`, { encoding: 'utf8' })
    expect(output).toContain('Atlas Bites CRM & Facturation — Assistant CLI')
    expect(output).toContain('Commandes principales :')
    expect(output).toContain('setup')
    expect(output).toContain('start')
    expect(output).toContain('stop')
  })

  it('should display version information with atlascrm version', () => {
    const output = execSync(`"${cliScript}" version`, { encoding: 'utf8' })
    expect(output).toContain('Atlas CRM CLI v1.0.0')
    expect(output).toContain(projectDir)
  })

  it('should report status with atlascrm status', () => {
    const output = execSync(`"${cliScript}" status`, { encoding: 'utf8' })
    expect(output).toContain('Atlas CRM — État des Services')
    expect(output).toContain('PostgreSQL DB')
    expect(output).toContain('Application Nuxt')
  })

  it('should run doctor diagnostic checks with exit code 0', () => {
    const output = execSync(`"${cliScript}" doctor`, { encoding: 'utf8' })
    expect(output).toContain('Atlas CRM — Diagnostic Système')
    expect(output).toContain('Répertoire du projet')
    expect(output).toContain('Node.js')
    expect(output).toContain('Docker CLI')
    expect(output).toContain('Aucun problème bloquant détecté.')
  })
})
