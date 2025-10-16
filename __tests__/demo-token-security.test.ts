/**
 * Demo Token Security Tests
 * 
 * Tests for demo token security features:
 * - Expiration enforcement (≤ 15 minutes)
 * - IAT skew validation
 * - Replay protection via JTI
 * - Host pinning validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateDemoToken, verifyDemoToken, DemoTokenPayload } from '@/lib/demo-auth'
import { storeTokenJti, isTokenUsed } from '@/lib/redis'
import { SignJWT } from 'jose'

// Mock Redis for testing
vi.mock('@/lib/redis', () => {
  const tokenStore = new Map<string, boolean>()
  
  return {
    storeTokenJti: vi.fn(async (jti: string) => {
      tokenStore.set(jti, true)
    }),
    isTokenUsed: vi.fn(async (jti: string) => {
      return tokenStore.has(jti)
    }),
    getRedisClient: vi.fn(() => ({
      setex: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
    })),
  }
})

describe('Demo Token Security', () => {
  const ORG_ID = 'test-org-123'
  const TEST_HOST = 'demo.example.com'
  const DEMO_TOKEN_SECRET = process.env.DEMO_TOKEN_SECRET || 'test-secret-key-for-testing'

  beforeEach(() => {
    vi.clearAllMocks()
    // Clear the token store between tests
    const tokenStore = new Map<string, boolean>()
  })

  describe('Token Generation', () => {
    it('should generate a valid token with all required fields', async () => {
      const token = await generateDemoToken(ORG_ID)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT structure
    })

    it('should generate a token with host pinning', async () => {
      const token = await generateDemoToken(ORG_ID, TEST_HOST)
      expect(token).toBeTruthy()
      
      // Verify token contains host
      const payload = await verifyDemoToken(token, TEST_HOST)
      expect(payload.host).toBe(TEST_HOST)
    })

    it('should generate unique JTI for each token', async () => {
      const token1 = await generateDemoToken(ORG_ID)
      const token2 = await generateDemoToken(ORG_ID)
      
      expect(token1).not.toBe(token2)
    })
  })

  describe('Expiration Enforcement (≤ 15 minutes)', () => {
    it('should accept token with 15 minute expiration', async () => {
      const token = await generateDemoToken(ORG_ID)
      const payload = await verifyDemoToken(token)
      
      const lifetime = payload.exp - payload.iat
      expect(lifetime).toBeLessThanOrEqual(15 * 60)
      expect(lifetime).toBeGreaterThan(0)
    })

    it('should reject token with expiration > 15 minutes', async () => {
      const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
      
      // Manually create token with 30 minute expiration
      const now = Math.floor(Date.now() / 1000)
      const badToken = await new SignJWT({
        orgId: ORG_ID,
        role: 'demo',
        jti: 'test-jti-123',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(now + 30 * 60) // 30 minutes
        .sign(secret)

      await expect(verifyDemoToken(badToken)).rejects.toThrow(
        'Token expiration exceeds maximum allowed duration'
      )
    })

    it('should reject expired token', async () => {
      const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
      
      // Create token that expired 1 minute ago
      const now = Math.floor(Date.now() / 1000)
      const expiredToken = await new SignJWT({
        orgId: ORG_ID,
        role: 'demo',
        jti: 'test-jti-expired',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now - 16 * 60) // Issued 16 minutes ago
        .setExpirationTime(now - 60) // Expired 1 minute ago
        .sign(secret)

      await expect(verifyDemoToken(expiredToken)).rejects.toThrow('Token has expired')
    })
  })

  describe('IAT Skew Validation', () => {
    it('should accept token with current timestamp', async () => {
      const token = await generateDemoToken(ORG_ID)
      const payload = await verifyDemoToken(token)
      
      const now = Math.floor(Date.now() / 1000)
      const skew = Math.abs(payload.iat - now)
      expect(skew).toBeLessThan(5) // Should be within 5 seconds
    })

    it('should reject token with IAT too far in future', async () => {
      const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
      
      // Create token with IAT 5 minutes in the future
      const now = Math.floor(Date.now() / 1000)
      const futureToken = await new SignJWT({
        orgId: ORG_ID,
        role: 'demo',
        jti: 'test-jti-future',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now + 5 * 60) // 5 minutes in future
        .setExpirationTime(now + 20 * 60)
        .sign(secret)

      await expect(verifyDemoToken(futureToken)).rejects.toThrow(
        'Token issued-at time is too far in the future'
      )
    })

    it('should reject token with IAT too old', async () => {
      const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
      
      // Create token issued 20 minutes ago (older than max expiry)
      const now = Math.floor(Date.now() / 1000)
      const oldToken = await new SignJWT({
        orgId: ORG_ID,
        role: 'demo',
        jti: 'test-jti-old',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now - 20 * 60) // 20 minutes ago
        .setExpirationTime(now + 60) // Still valid for 1 minute
        .sign(secret)

      await expect(verifyDemoToken(oldToken)).rejects.toThrow(
        'Token issued-at time is too old'
      )
    })
  })

  describe('Replay Protection (JTI)', () => {
    it('should store JTI after first use', async () => {
      const token = await generateDemoToken(ORG_ID)
      await verifyDemoToken(token)
      
      expect(storeTokenJti).toHaveBeenCalled()
    })

    it('should reject token used twice (replay attack)', async () => {
      const token = await generateDemoToken(ORG_ID)
      
      // First use should succeed
      const payload1 = await verifyDemoToken(token)
      expect(payload1).toBeTruthy()
      
      // Mark token as used
      const mockIsTokenUsed = vi.mocked(isTokenUsed)
      mockIsTokenUsed.mockResolvedValueOnce(true)
      
      // Second use should fail
      await expect(verifyDemoToken(token)).rejects.toThrow(
        'Token has already been used (replay attack detected)'
      )
    })

    it('should have unique JTI for each token', async () => {
      const token1 = await generateDemoToken(ORG_ID)
      const token2 = await generateDemoToken(ORG_ID)
      
      const payload1 = await verifyDemoToken(token1)
      const payload2 = await verifyDemoToken(token2)
      
      expect(payload1.jti).not.toBe(payload2.jti)
    })

    it('should store JTI with correct TTL', async () => {
      const token = await generateDemoToken(ORG_ID)
      const payload = await verifyDemoToken(token)
      
      const mockStoreTokenJti = vi.mocked(storeTokenJti)
      expect(mockStoreTokenJti).toHaveBeenCalled()
      
      const [jti, ttl] = mockStoreTokenJti.mock.calls[0]
      expect(jti).toBe(payload.jti)
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(15 * 60) // Max 15 minutes
    })
  })

  describe('Host Pinning', () => {
    it('should accept token on correct host', async () => {
      const token = await generateDemoToken(ORG_ID, TEST_HOST)
      const payload = await verifyDemoToken(token, TEST_HOST)
      
      expect(payload.host).toBe(TEST_HOST)
      expect(payload.orgId).toBe(ORG_ID)
    })

    it('should reject token on wrong host', async () => {
      const token = await generateDemoToken(ORG_ID, 'original.example.com')
      
      await expect(verifyDemoToken(token, 'different.example.com')).rejects.toThrow(
        'Token host mismatch'
      )
    })

    it('should normalize hosts for comparison', async () => {
      const token = await generateDemoToken(ORG_ID, 'https://demo.example.com:3000/')
      
      // Should accept normalized variants
      const payload = await verifyDemoToken(token, 'demo.example.com')
      expect(payload).toBeTruthy()
    })

    it('should work without host pinning (optional)', async () => {
      // Generate token without host
      const token = await generateDemoToken(ORG_ID)
      
      // Verify without host validation
      const payload = await verifyDemoToken(token)
      expect(payload.orgId).toBe(ORG_ID)
      expect(payload.host).toBeUndefined()
    })

    it('should skip validation if token has no host', async () => {
      const token = await generateDemoToken(ORG_ID) // No host
      
      // Should succeed even when expectedHost is provided
      const payload = await verifyDemoToken(token, 'any.example.com')
      expect(payload.orgId).toBe(ORG_ID)
    })
  })

  describe('Payload Validation', () => {
    it('should reject token with missing orgId', async () => {
      const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
      
      const badToken = await new SignJWT({
        role: 'demo',
        jti: 'test-jti',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + 15 * 60)
        .sign(secret)

      await expect(verifyDemoToken(badToken)).rejects.toThrow(
        'Invalid token payload structure'
      )
    })

    it('should reject token with wrong role', async () => {
      const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
      
      const badToken = await new SignJWT({
        orgId: ORG_ID,
        role: 'admin', // Wrong role
        jti: 'test-jti',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + 15 * 60)
        .sign(secret)

      await expect(verifyDemoToken(badToken)).rejects.toThrow(
        'Invalid token payload structure'
      )
    })

    it('should reject token with missing JTI', async () => {
      const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
      
      const badToken = await new SignJWT({
        orgId: ORG_ID,
        role: 'demo',
        // No JTI
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + 15 * 60)
        .sign(secret)

      await expect(verifyDemoToken(badToken)).rejects.toThrow(
        'Invalid token payload structure'
      )
    })
  })

  describe('Error Handling', () => {
    it('should reject token with invalid signature', async () => {
      const token = await generateDemoToken(ORG_ID)
      
      // Tamper with token
      const parts = token.split('.')
      parts[2] = 'invalid-signature'
      const tamperedToken = parts.join('.')

      await expect(verifyDemoToken(tamperedToken)).rejects.toThrow('Invalid demo token')
    })

    it('should reject malformed token', async () => {
      await expect(verifyDemoToken('not.a.valid.jwt.token')).rejects.toThrow()
    })

    it('should provide descriptive error messages', async () => {
      const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
      
      // Create expired token
      const now = Math.floor(Date.now() / 1000)
      const expiredToken = await new SignJWT({
        orgId: ORG_ID,
        role: 'demo',
        jti: 'test-expired',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now - 16 * 60)
        .setExpirationTime(now - 60)
        .sign(secret)

      try {
        await verifyDemoToken(expiredToken)
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Invalid demo token')
      }
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle full token lifecycle', async () => {
      // 1. Generate token
      const token = await generateDemoToken(ORG_ID, TEST_HOST)
      expect(token).toBeTruthy()

      // 2. Verify token (first use)
      const payload = await verifyDemoToken(token, TEST_HOST)
      expect(payload.orgId).toBe(ORG_ID)
      expect(payload.role).toBe('demo')
      expect(payload.jti).toBeTruthy()
      expect(payload.host).toBe(TEST_HOST)

      // 3. Store JTI
      expect(storeTokenJti).toHaveBeenCalledWith(
        payload.jti,
        expect.any(Number)
      )

      // 4. Replay attempt should fail
      vi.mocked(isTokenUsed).mockResolvedValueOnce(true)
      await expect(verifyDemoToken(token, TEST_HOST)).rejects.toThrow('replay attack')
    })

    it('should enforce all security checks in order', async () => {
      const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
      const now = Math.floor(Date.now() / 1000)

      // Create token that fails multiple checks
      const badToken = await new SignJWT({
        orgId: ORG_ID,
        role: 'demo',
        jti: 'test-jti',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now + 5 * 60) // Future IAT (should fail before other checks)
        .setExpirationTime(now + 35 * 60) // 35 minutes (also invalid)
        .sign(secret)

      // Should fail on IAT check (first security check)
      await expect(verifyDemoToken(badToken)).rejects.toThrow('issued-at time')
    })
  })
})
