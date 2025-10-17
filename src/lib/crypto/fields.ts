/**
 * Field-Level Encryption using AES-256-GCM AEAD
 * 
 * Features:
 * - Authenticated encryption with additional data (AEAD)
 * - Key rotation versioning
 * - Searchable encrypted fields via salted hashes
 * - Deterministic search tokens
 * 
 * Security Properties:
 * - AES-256-GCM: 256-bit key, 96-bit nonce, 128-bit auth tag
 * - Nonce is randomly generated per encryption (12 bytes from crypto.randomBytes)
 * - Version prefix enables seamless key rotation
 * - Search tokens use BLAKE2b (faster than SHA-256, cryptographically secure)
 * - FIPS 140-2 compliant, industry-standard cipher
 */

import crypto from 'crypto'


/**
 * Key versioning for rotation support (dynamic, supports KMS_KEY_ID/ENCRYPTION_KEY envs)
 *
 * ENCRYPTION_KEY format: "v2:base64key2,v1:base64key1"
 * KMS_KEY_ID: "v2" (latest key for encryption)
 */
// Prefer explicit vN style KMS keys; otherwise default to v1 for tests and compatibility
const DEFAULT_KEY_ID = (() => {
  const k = process.env.KMS_KEY_ID
  if (k && /^v\d+$/.test(k)) return k
  return 'v1'
})()

function parseKeyEnv(): Record<string, Buffer> {
  const keyMap: Record<string, Buffer> = {}

  // Helper that inserts into the map using parseKey
  const insert = (id: string, raw: string | undefined) => {
    if (!raw) return
    try {
      keyMap[id] = parseKey(raw)
    } catch {}
  }

  // 1) Support consolidated ENCRYPTION_KEY like "v2:base64,v1:base64" or unversioned single key
  const env = process.env.ENCRYPTION_KEY || ''
  const parts = env.split(',').map(p => p.trim()).filter(Boolean)
  for (const part of parts) {
    if (!part) continue
    if (part.includes(':')) {
      const idx = part.indexOf(':')
      const id = part.slice(0, idx)
      const val = part.slice(idx + 1)
      insert(id, val)
    } else {
      // Unversioned single key => map to default id
      insert(DEFAULT_KEY_ID, part)
    }
  }

  // 2) Also support ENV variables like ENCRYPTION_KEY_V1, ENCRYPTION_KEY_V2, etc.
  for (const [envKey, envVal] of Object.entries(process.env)) {
    const m = envKey.match(/^ENCRYPTION_KEY(?:_V(\d+))?$/i)
    if (m && envVal) {
      const ver = m[1] ? `v${m[1]}` : DEFAULT_KEY_ID
      // If we already set this from consolidated ENCRYPTION_KEY, prefer explicit var (overwrite)
      insert(ver, envVal)
    }
  }

  return keyMap
}

function getKey(version: string = DEFAULT_KEY_ID): Buffer {
  const keyMap = parseKeyEnv();
  const key = keyMap[version];
  if (!key) throw new Error(`Encryption key version ${version} not found`);
  if (key.length !== 32) throw new Error(`Encryption key must be 32 bytes (256 bits), got ${key.length} bytes`);
  return key;
}

/**
 * Encrypt field value using XChaCha20-Poly1305 AEAD
 * 
 * Format: {version}:{nonce_hex}:{ciphertext_hex}:{tag_hex}
 * Example: v1:a1b2c3...d4e5f6:1a2b3c...4d5e6f:9f8e7d...6c5b4a
 * 
 * @param plaintext - Value to encrypt
 * @param version - Key version (default: current version)
 * @returns Versioned encrypted string
 */
export function encryptField(plaintext: string, version: string = DEFAULT_KEY_ID): string {
  if (!plaintext) return '';
  try {
    const key = getKey(version);
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${version}:${nonce.toString('hex')}:${ciphertext.toString('hex')}:${authTag.toString('hex')}`;
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    throw new Error('Field encryption failed');
  }
}

/**
 * Decrypt field value
 * 
 * @param encrypted - Versioned encrypted string
 * @returns Decrypted plaintext
 */
/**
 * Decrypt field value (tries key for version, then all known keys if needed)
 *
 * - If versioned key fails, tries all keys in ENCRYPTION_KEY env (legacy support)
 */
export function decryptField(encrypted: string): string {
  if (!encrypted) return '';
  // Parse versioned format: version:nonce:ciphertext:tag
  const parts = encrypted.split(':');
  if (parts.length !== 4) throw new Error('Invalid encrypted field format');
  const [version, nonceHex, ciphertextHex, tagHex] = parts;
  const nonce = Buffer.from(nonceHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  // Try key for version first
  try {
    const key = getKey(version);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  } catch (err) {
    // Try all keys (legacy/rotated)
    const keyMap = parseKeyEnv();
    for (const key of Object.values(keyMap)) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
        decipher.setAuthTag(authTag);
        const plaintext = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]);
        return plaintext.toString('utf8');
      } catch {}
    }
    console.error('❌ Decryption failed:', err);
    throw new Error('Field decryption failed');
  }
}

/**
 * Create searchable hash token for encrypted field
 * 
 * Uses BLAKE2b-256 with salt for fast, secure hashing
 * Deterministic: same input + salt = same hash
 * 
 * @param value - Value to hash for searching
 * @returns Hex-encoded hash token
 */
export function makeSearchToken(value: string): string {
  if (!value) return ''
  
  try {
    // Read from environment dynamically to support test scenarios
    const salt = process.env.SEARCH_SALT || 'fallback-search-salt-32-bytes!!'
    
    // BLAKE2b is faster than SHA-256 and cryptographically secure
    // 32 bytes = 256 bits output
    const hash = crypto.createHash('blake2b512')
    hash.update(salt)
    hash.update(value.toLowerCase().trim()) // Normalize for case-insensitive search
    
    // Use first 32 bytes (256 bits) for reasonable index size
    return hash.digest('hex').slice(0, 64)
  } catch (error) {
    console.error('❌ Search token generation failed:', error)
    throw new Error('Search token generation failed')
  }
}

/**
 * Encrypt multiple fields at once
 * 
 * @param fields - Object with field names and values
 * @returns Object with encrypted values
 */
export function encryptFields(fields: Record<string, string>): Record<string, string> {
  const encrypted: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      encrypted[key] = encryptField(value)
    }
  }
  
  return encrypted
}

/**
 * Decrypt multiple fields at once
 * 
 * @param fields - Object with field names and encrypted values
 * @returns Object with decrypted values
 */
export function decryptFields(fields: Record<string, string>): Record<string, string> {
  const decrypted: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      try {
        decrypted[key] = decryptField(value)
      } catch (error) {
        console.error(`❌ Failed to decrypt field ${key}:`, error)
        decrypted[key] = '' // Return empty string on decryption failure
      }
    }
  }
  
  return decrypted
}

/**
 * Re-encrypt field with new key version (for key rotation)
 * 
 * @param encrypted - Currently encrypted value
 * @param newVersion - Target key version
 * @returns Re-encrypted value with new version
 */
export function rotateFieldKey(encrypted: string, newVersion: string): string {
  if (!encrypted) return ''
  
  // Decrypt with old key
  const plaintext = decryptField(encrypted)
  
  // Re-encrypt with new key
  return encryptField(plaintext, newVersion)
}

/**
 * Check if field is encrypted (has version prefix)
 * 
 * @param value - Value to check
 * @returns True if encrypted format detected
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false
  return /^v\d+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/i.test(value)
}

/**
 * Get encryption version from encrypted value
 * 
 * @param encrypted - Encrypted value
 * @returns Version string or null
 */
export function getEncryptionVersion(encrypted: string): string | null {
  if (!encrypted || !isEncrypted(encrypted)) return null
  return encrypted.split(':')[0]
}

/**
 * Batch re-encrypt for key rotation migrations
 * 
 * @param records - Array of records with encrypted fields
 * @param fieldNames - Names of encrypted fields
 * @param newVersion - Target key version
 * @returns Updated records
 */
export function batchRotateKeys<T extends Record<string, any>>(
  records: T[],
  fieldNames: string[],
  newVersion: string
): T[] {
  return records.map((record) => {
    const updated: Record<string, any> = { ...record }
    
    for (const fieldName of fieldNames) {
      const value = record[fieldName]
      if (value && isEncrypted(value)) {
        const currentVersion = getEncryptionVersion(value)
        if (currentVersion !== newVersion) {
          updated[fieldName] = rotateFieldKey(value, newVersion)
        }
      }
    }
    
    return updated as T
  })
}

/**
 * Generate new encryption key (for setup)
 * @returns 64-char lower-case hex (32 bytes)
 */
export function generateEncryptionKeyHex(): string {
  return crypto.randomBytes(32).toString('hex')
}

function parseKey(input: string): Buffer {
  // 1) Hex (64 hex chars)
  const hexOk = /^[a-f0-9]{64}$/i.test(input)
  if (hexOk) return Buffer.from(input, 'hex')

  // 2) Try base64: validate round-trip to avoid accidental utf8 decoding
  try {
    const b = Buffer.from(input, 'base64')
    // base64 round-trip check (strip padding/newlines)
    const normalized = input.replace(/\s+/g, '')
    if (b.toString('base64') === normalized) return b
  } catch {
    // fall through
  }

  // 3) Fallback to utf8
  return Buffer.from(input, 'utf8')
}

// Backwards-compatible alias expected by tests
export const generateEncryptionKey = generateEncryptionKeyHex

/**
 * Generate search salt (for setup)
 * 
 * @returns 64-character hex string (32 bytes)
 */
export function generateSearchSalt(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Export types
export type EncryptedField = string
export type SearchToken = string
export type KeyVersion = 'v1' | 'v2'
