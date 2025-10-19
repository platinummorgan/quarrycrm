import {
  encryptField,
  decryptField,
  makeSearchToken,
  generateEncryptionKeyHex,
} from '@/lib/crypto/fields'

test('encrypt -> decrypt and search token format', () => {
  // Use a deterministic key from .env.test if set; tests will already have env loaded by setup
  const plaintext = 'test@example.com'
  const encrypted = encryptField(plaintext)
  expect(encrypted).toBeTruthy()
  expect(encrypted).not.toBe(plaintext)

  const decrypted = decryptField(encrypted)
  expect(decrypted).toBe(plaintext)

  const token = makeSearchToken(plaintext)
  // Should be 64 hex chars (32 bytes -> 64 hex-chars)
  expect(typeof token).toBe('string')
  expect(token).toHaveLength(64)
  expect(token).toMatch(/^[a-f0-9]{64}$/)

  // generateEncryptionKeyHex should return a 64-char lowercase hex
  const key = generateEncryptionKeyHex()
  expect(key).toHaveLength(64)
  expect(key).toMatch(/^[a-f0-9]{64}$/)
})
