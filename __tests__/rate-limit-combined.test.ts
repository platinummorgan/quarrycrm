/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkCombinedRateLimit,
  resetRateLimit,
  WriteRateLimits,
  withWriteRateLimit,
} from '@/lib/rate-limit'
import { getRedisClient } from '@/lib/redis'
import { NextRequest, NextResponse } from 'next/server'

// Mock Redis
vi.mock('@/lib/redis', () => {
  const store = new Map<string, { value: string; expiresAt: number }>()

  return {
    getRedisClient: vi.fn(() => ({
      async setex(key: string, ttlSeconds: number, value: string) {
        const expiresAt = Date.now() + ttlSeconds * 1000
        store.set(key, { value, expiresAt })
      },
      async get(key: string) {
        const entry = store.get(key)
        if (!entry) return null
        if (Date.now() >= entry.expiresAt) {
          store.delete(key)
          return null
        }
        return entry.value
      },
      async del(key: string) {
        store.delete(key)
      },
    })),
    __store: store,
  }
})

describe('Combined Rate Limiting (IP + Org)', () => {
  beforeEach(async () => {
    // Clear rate limit state
    const testIps = ['192.168.1.100', '192.168.1.101', '192.168.1.102']
    const testOrgs = ['org-1', 'org-2', 'org-3']

    for (const ip of testIps) {
      await resetRateLimit(ip, 'ratelimit:write:test:ip')
    }

    for (const org of testOrgs) {
      await resetRateLimit(org, 'ratelimit:write:test:org')
    }
  })

  describe('checkCombinedRateLimit', () => {
    it('should allow requests within both IP and org limits', async () => {
      const config = {
        limit: 60,
        burst: 120,
        windowMs: 60000,
        keyPrefix: 'ratelimit:write:test',
      }

      const result = await checkCombinedRateLimit(
        '192.168.1.100',
        'org-1',
        config
      )

      expect(result.success).toBe(true)
      expect(result.limit).toBe(60)
      expect(result.remaining).toBeGreaterThan(0)
    })

    it('should block when IP exceeds burst limit', async () => {
      const config = {
        limit: 60,
        burst: 3,
        windowMs: 60000,
        keyPrefix: 'ratelimit:write:test',
      }

      const ip = '192.168.1.101'
      const org = 'org-2'

      // Make 3 requests (burst limit)
      await checkCombinedRateLimit(ip, org, config)
      await checkCombinedRateLimit(ip, org, config)
      await checkCombinedRateLimit(ip, org, config)

      // 4th request should be blocked
      const result = await checkCombinedRateLimit(ip, org, config)

      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should block when org exceeds normal limit', async () => {
      const config = {
        limit: 2,
        burst: 10,
        windowMs: 60000,
        keyPrefix: 'ratelimit:write:test',
      }

      const org = 'org-3'

      // Make 2 requests from different IPs (org limit)
      await checkCombinedRateLimit('192.168.1.100', org, config)
      await checkCombinedRateLimit('192.168.1.101', org, config)

      // 3rd request should be blocked (org limit exceeded)
      const result = await checkCombinedRateLimit('192.168.1.102', org, config)

      expect(result.success).toBe(false)
    })

    it('should use more restrictive limit between IP and org', async () => {
      const config = {
        limit: 5,
        burst: 10,
        windowMs: 60000,
        keyPrefix: 'ratelimit:write:test2',
      }

      const ip = '192.168.1.103'
      const org = 'org-4'

      // Make 3 IP requests
      await checkCombinedRateLimit(ip, org, config)
      await checkCombinedRateLimit(ip, org, config)
      const result = await checkCombinedRateLimit(ip, org, config)

      // Should return the minimum of IP remaining and org remaining
      expect(result.success).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })

    it('should work without org ID (IP-only rate limiting)', async () => {
      const config = {
        limit: 60,
        burst: 120,
        windowMs: 60000,
        keyPrefix: 'ratelimit:write:test',
      }

      const result = await checkCombinedRateLimit('192.168.1.104', null, config)

      expect(result.success).toBe(true)
      expect(result.limit).toBe(60)
    })
  })

  describe('WriteRateLimits configuration', () => {
    it('should have CONTACTS with burst support', () => {
      expect(WriteRateLimits.CONTACTS.limit).toBe(100)
      expect(WriteRateLimits.CONTACTS.burst).toBe(120)
      expect(WriteRateLimits.CONTACTS.windowMs).toBe(60000)
    })

    it('should have DEALS with burst support', () => {
      expect(WriteRateLimits.DEALS.limit).toBe(50)
      expect(WriteRateLimits.DEALS.burst).toBe(120)
    })

    it('should have IMPORT with burst support', () => {
      expect(WriteRateLimits.IMPORT.limit).toBe(5)
      expect(WriteRateLimits.IMPORT.burst).toBe(120)
    })

    it('should have EMAIL_LOG with burst support', () => {
      expect(WriteRateLimits.EMAIL_LOG.limit).toBe(200)
      expect(WriteRateLimits.EMAIL_LOG.burst).toBe(120)
    })
  })

  describe('withWriteRateLimit middleware', () => {
    it('should allow requests within limit', async () => {
      const mockHandler = vi.fn(async () => {
        return NextResponse.json({ success: true })
      })

      const config = {
        limit: 60,
        burst: 120,
        windowMs: 60000,
        keyPrefix: 'test-write-middleware',
      }

      const wrapped = withWriteRateLimit(
        mockHandler,
        config,
        async () => 'org-test-1'
      )

      const request = new NextRequest('https://example.com/api/contacts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.200' },
      })

      const response = await wrapped(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockHandler).toHaveBeenCalled()
      expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
      expect(response.headers.get('X-RateLimit-Scope')).toBe('ip+org')
    })

    it('should block requests exceeding burst limit', async () => {
      const mockHandler = vi.fn(async () => {
        return NextResponse.json({ success: true })
      })

      const config = {
        limit: 60,
        burst: 2,
        windowMs: 60000,
        keyPrefix: 'test-write-burst',
      }

      const wrapped = withWriteRateLimit(
        mockHandler,
        config,
        async () => 'org-test-2'
      )

      const request = new NextRequest('https://example.com/api/contacts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.201' },
      })

      // Make requests up to burst limit
      await wrapped(request)
      await wrapped(request)

      // Next request should be blocked
      const response = await wrapped(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(response.headers.get('Retry-After')).toBeTruthy()
      expect(mockHandler).toHaveBeenCalledTimes(2) // Should not be called for blocked request
    })

    it('should return proper error response with retry info', async () => {
      const mockHandler = vi.fn(async () => {
        return NextResponse.json({ success: true })
      })

      const config = {
        limit: 60,
        burst: 1,
        windowMs: 60000,
        keyPrefix: 'test-write-retry',
      }

      const wrapped = withWriteRateLimit(
        mockHandler,
        config,
        async () => 'org-test-3'
      )

      const request = new NextRequest('https://example.com/api/contacts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.202' },
      })

      await wrapped(request) // Use up the limit
      const response = await wrapped(request) // Should be blocked

      expect(response.status).toBe(429)
      expect(response.headers.get('Retry-After')).toBeTruthy()
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })

    it('should include rate limit scope in headers', async () => {
      const mockHandler = vi.fn(async () => {
        return NextResponse.json({ success: true })
      })

      const config = {
        limit: 60,
        burst: 120,
        windowMs: 60000,
        keyPrefix: 'test-write-scope',
      }

      // With org ID
      const wrappedWithOrg = withWriteRateLimit(
        mockHandler,
        config,
        async () => 'org-test-4'
      )

      const request1 = new NextRequest('https://example.com/api/contacts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.203' },
      })

      const response1 = await wrappedWithOrg(request1)
      expect(response1.headers.get('X-RateLimit-Scope')).toBe('ip+org')

      // Without org ID
      const wrappedWithoutOrg = withWriteRateLimit(
        mockHandler,
        config,
        async () => null
      )

      const request2 = new NextRequest('https://example.com/api/contacts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.204' },
      })

      const response2 = await wrappedWithoutOrg(request2)
      expect(response2.headers.get('X-RateLimit-Scope')).toBe('ip')
    })
  })

  describe('Burst capacity behavior', () => {
    it('should allow burst up to burst limit, then enforce normal limit', async () => {
      const config = {
        limit: 60,
        burst: 120,
        windowMs: 60000,
        keyPrefix: 'ratelimit:write:burst-test',
      }

      const ip = '192.168.1.200'
      const org = 'org-burst'

      // Should allow up to burst limit (120) for IP
      for (let i = 0; i < 120; i++) {
        const result = await checkCombinedRateLimit(ip, org, config)
        if (!result.success) {
          // Org limit (60) might be hit first
          expect(i).toBeGreaterThanOrEqual(60)
          break
        }
      }

      // 121st request should be blocked
      const blockedResult = await checkCombinedRateLimit(ip, org, config)
      expect(blockedResult.success).toBe(false)
    })
  })
})
