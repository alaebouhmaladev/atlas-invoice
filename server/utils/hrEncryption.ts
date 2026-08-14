import crypto from 'node:crypto'
import { Prisma } from '@prisma/client'

const ALGORITHM = 'aes-256-gcm'

/**
 * Validates and retrieves the raw HR master key from environment variables.
 * Enforces dedicated HR_ENCRYPTION_KEY in production.
 */
export function getRawHrMasterKey(): Buffer {
  const isProd = process.env.NODE_ENV === 'production'
  const envKey = process.env.HR_ENCRYPTION_KEY

  if (isProd) {
    if (!envKey) {
      throw new Error('[SECURITY ERROR] HR_ENCRYPTION_KEY environment variable is required in production mode.')
    }
  }

  const rawKey = envKey || process.env.ENCRYPTION_KEY || 'atlas-bites-hr-master-dev-secret-key-32b!'

  // Validate key format and length
  let keyBuffer: Buffer
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    keyBuffer = Buffer.from(rawKey, 'hex')
  } else {
    keyBuffer = Buffer.from(rawKey, 'utf8')
    if (keyBuffer.length < 32) {
      // Pad or hash to 32 bytes for dev compatibility
      keyBuffer = crypto.createHash('sha256').update(rawKey).digest()
    } else {
      keyBuffer = keyBuffer.subarray(0, 32)
    }
  }

  return keyBuffer
}

/**
 * Derives a domain-separated 32-byte key for AES-256-GCM encryption
 */
export function getHrEncryptionKey(): Buffer {
  const masterKey = getRawHrMasterKey()
  return Buffer.from(crypto.hkdfSync('sha256', masterKey, Buffer.alloc(0), Buffer.from('AtlasBites-HR-AES256GCM-v1'), 32))
}

/**
 * Derives a domain-separated 32-byte key for HMAC-SHA256 CIN fingerprinting
 */
export function getHrFingerprintKey(): Buffer {
  const masterKey = getRawHrMasterKey()
  return Buffer.from(crypto.hkdfSync('sha256', masterKey, Buffer.alloc(0), Buffer.from('AtlasBites-HR-CIN-HMAC-v1'), 32))
}

/**
 * Encrypts a sensitive string value using AES-256-GCM with domain-separated key
 */
export function encryptSensitiveField(plaintext: string | null | undefined): string | null {
  if (!plaintext || !plaintext.trim()) return null

  const key = getHrEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext.trim(), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // Format: iv:tag:ciphertext (all hex encoded)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts an AES-256-GCM encrypted string, supporting domain-separated subkey and legacy fallback
 */
export function decryptSensitiveField(encryptedPayload: string | null | undefined): string | null {
  if (!encryptedPayload || !encryptedPayload.trim()) return null

  const parts = encryptedPayload.split(':')
  if (parts.length !== 3) return encryptedPayload // Return plain if unencrypted

  const iv = Buffer.from(parts[0], 'hex')
  const tag = Buffer.from(parts[1], 'hex')
  const ciphertext = Buffer.from(parts[2], 'hex')

  // Try current domain-separated key first
  try {
    const key = getHrEncryptionKey()
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    // Fallback to legacy master key for pre-existing encrypted records
    try {
      const legacyKey = crypto.createHash('sha256').update(getRawHrMasterKey()).digest()
      const decipher = crypto.createDecipheriv(ALGORITHM, legacyKey, iv)
      decipher.setAuthTag(tag)
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
      return decrypted.toString('utf8')
    } catch {
      return null
    }
  }
}

/**
 * Computes a deterministic keyed HMAC-SHA256 fingerprint for CIN uniqueness lookup using domain-separated HMAC subkey
 */
export function computeCinFingerprint(cin: string | null | undefined): string | null {
  if (!cin || !cin.trim()) return null
  const normalized = cin.trim().toUpperCase()
  const hmacKey = getHrFingerprintKey()
  return crypto.createHmac('sha256', hmacKey).update(normalized).digest('hex')
}

/**
 * Mask CIN for safe display (e.g. AB123456 -> AB••••56)
 */
export function maskCin(cin: string | null | undefined): string {
  if (!cin) return '-'
  const clean = cin.trim()
  if (clean.length <= 4) return '••••'
  const prefix = clean.substring(0, 2)
  const suffix = clean.substring(clean.length - 2)
  return `${prefix}${'•'.repeat(Math.max(4, clean.length - 4))}${suffix}`
}

/**
 * Mask RIB for safe display (e.g. 230780000000000000000123 -> •••• •••• •••• 0123)
 */
export function maskRib(rib: string | null | undefined): string {
  if (!rib) return '-'
  const clean = rib.replace(/\s+/g, '')
  if (clean.length <= 4) return '••••'
  const suffix = clean.substring(clean.length - 4)
  return `•••• •••• •••• ${suffix}`
}

/**
 * Mask CNSS number for safe display (e.g. 123456789 -> ••••••6789)
 */
export function maskCnss(cnss: string | null | undefined): string {
  if (!cnss) return '-'
  const clean = cnss.trim()
  if (clean.length <= 4) return '••••'
  const suffix = clean.substring(clean.length - 4)
  return `${'•'.repeat(Math.max(4, clean.length - 4))}${suffix}`
}

/**
 * Mask Base Salary for unauthorized roles
 */
export function maskSalary(_salary: number | string | Prisma.Decimal | null | undefined): string {
  return '•••••• MAD'
}
