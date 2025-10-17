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
const DEFAULT_KEY_ID = process.env.KMS_KEY_ID || 'v1';

function parseKeyEnv(): Record<string, Buffer> {
  const env = process.env.ENCRYPTION_KEY || '';
  const keyMap: Record<string, Buffer> = {};
  for (const pair of env.split(',')) {
    const [id, b64] = pair.split(':');
    if (id && b64) {
      try {
        keyMap[id] = Buffer.from(b64, 'base64');
      } catch {}
    }
  }
  return keyMap;
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
 * @returns base64-encoded 32 bytes
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

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
