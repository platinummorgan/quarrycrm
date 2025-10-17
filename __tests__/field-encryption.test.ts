/**
 * Tests for Field-Level Encryption
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  encryptField,
  decryptField,
  makeSearchToken,
  isEncrypted,
  getEncryptionVersion,
  rotateFieldKey,
  encryptFields,
  decryptFields,
  generateEncryptionKey,
  generateSearchSalt,
} from '../src/lib/crypto/fields'

// Set test environment variables
beforeAll(() => {
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  process.env.ENCRYPTION_KEY_V2 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'
  process.env.SEARCH_SALT = 'test-salt-32-bytes-for-testing!'
})

describe('Field Encryption', () => {
  describe('encryptField', () => {
    it('should encrypt a plaintext value', () => {
      const plaintext = 'test@example.com'
      const encrypted = encryptField(plaintext)

      expect(encrypted).toBeTruthy()
      expect(encrypted).not.toBe(plaintext)
      expect(encrypted).toMatch(/^v\d+:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/)
    })

    it('should return empty string for empty input', () => {
      expect(encryptField('')).toBe('')
    })

    it('should generate different ciphertext for same plaintext (random nonce)', () => {
      const plaintext = 'test@example.com'
      const encrypted1 = encryptField(plaintext)
      const encrypted2 = encryptField(plaintext)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should include version prefix', () => {
      const encrypted = encryptField('test', 'v1')
      expect(encrypted).toMatch(/^v1:/)
    })
  })

  describe('decryptField', () => {
    it('should decrypt an encrypted value', () => {
      const plaintext = 'test@example.com'
      const encrypted = encryptField(plaintext)
      const decrypted = decryptField(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should return empty string for empty input', () => {
      expect(decryptField('')).toBe('')
    })

    it('should decrypt long strings', () => {
      const plaintext = 'This is a very long string with special characters: !@#$%^&*()_+-=[]{}|;:,.<>?'
      const encrypted = encryptField(plaintext)
      const decrypted = decryptField(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should decrypt unicode characters', () => {
      const plaintext = '你好世界 🔐 مرحبا بالعالم'
      const encrypted = encryptField(plaintext)
      const decrypted = decryptField(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should throw error for invalid format', () => {
      expect(() => decryptField('invalid-format')).toThrow()
    })

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encryptField('test@example.com')
      const tampered = encrypted.replace(/[a-f]/, 'x') // Corrupt one character

      expect(() => decryptField(tampered)).toThrow()
    })
  })

  describe('makeSearchToken', () => {
    it('should create deterministic hash', () => {
      const value = 'test@example.com'
      const hash1 = makeSearchToken(value)
      const hash2 = makeSearchToken(value)

      expect(hash1).toBe(hash2)
    })

    it('should return empty string for empty input', () => {
      expect(makeSearchToken('')).toBe('')
    })

    it('should create different hashes for different values', () => {
      const hash1 = makeSearchToken('test1@example.com')
      const hash2 = makeSearchToken('test2@example.com')

      expect(hash1).not.toBe(hash2)
    })

    it('should be case-insensitive', () => {
      const hash1 = makeSearchToken('Test@Example.COM')
      const hash2 = makeSearchToken('test@example.com')

      expect(hash1).toBe(hash2)
    })

    it('should trim whitespace', () => {
      const hash1 = makeSearchToken('  test@example.com  ')
      const hash2 = makeSearchToken('test@example.com')

      expect(hash1).toBe(hash2)
    })

    it('should produce 64-character hex string', () => {
      const hash = makeSearchToken('test@example.com')
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('isEncrypted', () => {
    it('should detect encrypted values', () => {
      const encrypted = encryptField('test@example.com')
      expect(isEncrypted(encrypted)).toBe(true)
    })

    it('should return false for plaintext', () => {
      expect(isEncrypted('test@example.com')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false)
    })

    it('should return false for invalid format', () => {
      expect(isEncrypted('v1:invalid')).toBe(false)
    })
  })

  describe('getEncryptionVersion', () => {
    it('should extract version from encrypted value', () => {
      const encrypted = encryptField('test', 'v1')
      expect(getEncryptionVersion(encrypted)).toBe('v1')
    })

    it('should return null for plaintext', () => {
      expect(getEncryptionVersion('test@example.com')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(getEncryptionVersion('')).toBeNull()
    })
  })

  describe('rotateFieldKey', () => {
    it('should re-encrypt with new key version', () => {
      const plaintext = 'test@example.com'
      const encrypted_v1 = encryptField(plaintext, 'v1')
      const encrypted_v2 = rotateFieldKey(encrypted_v1, 'v2')

      expect(getEncryptionVersion(encrypted_v2)).toBe('v2')
      expect(decryptField(encrypted_v2)).toBe(plaintext)
    })

    it('should preserve plaintext after rotation', () => {
      const plaintext = 'sensitive-data'
      const encrypted_v1 = encryptField(plaintext, 'v1')
      const encrypted_v2 = rotateFieldKey(encrypted_v1, 'v2')
      const decrypted = decryptField(encrypted_v2)

      expect(decrypted).toBe(plaintext)
    })
  })

  describe('encryptFields', () => {
    it('should encrypt multiple fields', () => {
      const fields = {
        email: 'test@example.com',
        phone: '+1234567890',
        notes: 'Secret notes',
      }

      const encrypted = encryptFields(fields)

      expect(isEncrypted(encrypted.email)).toBe(true)
      expect(isEncrypted(encrypted.phone)).toBe(true)
      expect(isEncrypted(encrypted.notes)).toBe(true)
    })

    it('should skip empty values', () => {
      const fields = {
        email: 'test@example.com',
        phone: '',
      }

      const encrypted = encryptFields(fields)

      expect(encrypted.email).toBeTruthy()
      expect(encrypted.phone).toBeUndefined()
    })
  })

  describe('decryptFields', () => {
    it('should decrypt multiple fields', () => {
      const fields = {
        email: 'test@example.com',
        phone: '+1234567890',
      }

      const encrypted = encryptFields(fields)
      const decrypted = decryptFields(encrypted)

      expect(decrypted.email).toBe(fields.email)
      expect(decrypted.phone).toBe(fields.phone)
    })

    it('should return empty string for decryption failures', () => {
      const fields = {
        email: 'invalid-encrypted-value',
      }

      const decrypted = decryptFields(fields)

      expect(decrypted.email).toBe('')
    })
  })

  describe('Key Generation', () => {
    it('should generate valid encryption key', () => {
      const key = generateEncryptionKey()

      expect(key).toMatch(/^[a-f0-9]{64}$/)
      expect(key.length).toBe(64)
    })

    it('should generate different keys each time', () => {
      const key1 = generateEncryptionKey()
      const key2 = generateEncryptionKey()

      expect(key1).not.toBe(key2)
    })

    it('should generate valid search salt', () => {
      const salt = generateSearchSalt()

      expect(salt).toMatch(/^[a-f0-9]{64}$/)
      expect(salt.length).toBe(64)
    })
  })

  describe('Security Properties', () => {
    it('should use authenticated encryption (tamper detection)', () => {
      const encrypted = encryptField('test@example.com')
      const parts = encrypted.split(':')
      
      // Tamper with authentication tag
      const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${'0'.repeat(32)}`

      expect(() => decryptField(tampered)).toThrow()
    })

    it('should use different nonce for each encryption', () => {
      const plaintext = 'test'
      const encrypted1 = encryptField(plaintext)
      const encrypted2 = encryptField(plaintext)

      const nonce1 = encrypted1.split(':')[1]
      const nonce2 = encrypted2.split(':')[1]

      expect(nonce1).not.toBe(nonce2)
    })

    it('should use 96-bit nonces for AES-GCM (12 bytes = 24 hex chars)', () => {
      const encrypted = encryptField('test')
      const nonce = encrypted.split(':')[1]

      expect(nonce.length).toBe(24) // 12 bytes * 2 hex chars
    })

    it('should use 128-bit auth tags (16 bytes = 32 hex chars)', () => {
      const encrypted = encryptField('test')
      const tag = encrypted.split(':')[3]

      expect(tag.length).toBe(32) // 16 bytes * 2 hex chars
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long strings', () => {
      const plaintext = 'a'.repeat(10000)
      const encrypted = encryptField(plaintext)
      const decrypted = decryptField(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const encrypted = encryptField(plaintext)
      const decrypted = decryptField(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle newlines and whitespace', () => {
      const plaintext = 'Line 1\nLine 2\r\nLine 3\t\tTabbed'
      const encrypted = encryptField(plaintext)
      const decrypted = decryptField(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle empty object for encryptFields', () => {
      const encrypted = encryptFields({})
      expect(encrypted).toEqual({})
    })

    it('should handle empty object for decryptFields', () => {
      const decrypted = decryptFields({})
      expect(decrypted).toEqual({})
    })
  })
})
