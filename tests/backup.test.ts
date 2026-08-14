import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runBackup } from '../scripts/backup'

describe('Backup & Manifest Unit Tests', () => {
  const testBackupDir = path.join(process.cwd(), 'tmp', 'test_backups')

  beforeAll(() => {
    if (!fs.existsSync(testBackupDir)) {
      fs.mkdirSync(testBackupDir, { recursive: true })
    }
  })

  afterAll(() => {
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true })
    }
  })

  it('should run backup and generate valid manifest with SHA-256 checksums', async () => {
    const manifest = await runBackup({ outputDir: testBackupDir })

    expect(manifest).toBeDefined()
    expect(manifest?.success).toBe(true)
    expect(manifest?.dbDumpFilename).toContain('atlas-bites-db-')
    expect(manifest?.assetArchiveFilename).toContain('atlas-bites-assets-')
    expect(manifest?.dbDumpSha256).toBeDefined()
    expect(manifest?.dbDumpSha256.length).toBe(64)

    const manifestPath = path.join(testBackupDir, 'manifest.json')
    expect(fs.existsSync(manifestPath)).toBe(true)
  })
})
