/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, resetRateLimit, getClientIp, DemoRateLimits } from '@/lib/rate-limit'
import { getRedisClient } from '@/lib/redis'

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
    // Expose store for testing
    __store: store,
  }
})

describe('Rate Limiter', () => {
  beforeEach(async () => {
    // Clear Redis store by resetting all test identifiers
    const testIps = [
      '192.168.1.1', '192.168.1.2', '192.168.1.3', '192.168.1.4',
      '192.168.1.5', '192.168.1.6', '192.168.1.7', '192.168.1.8',
      '192.168.1.9', '192.168.1.10', '192.168.1.11', '192.168.1.12',
    ]
    
    const prefixes = ['test', 'auth', 'api']
    
    for (const ip of testIps) {
      for (const prefix of prefixes) {
        await resetRateLimit(ip, prefix)
      }
    }
  })

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      const result = await checkRateLimit('192.168.1.1', {
        limit: 5,
        windowMs: 60000,
        keyPrefix: 'test',
      })

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4)
      expect(result.limit).toBe(5)
      expect(result.retryAfter).toBeUndefined()
    })

    it('should track multiple requests within limit', async () => {
      const config = { limit: 3, windowMs: 60000, keyPrefix: 'test' }
      const ip = '192.168.1.2'

      const result1 = await checkRateLimit(ip, config)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(2)

      const result2 = await checkRateLimit(ip, config)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(1)

      const result3 = await checkRateLimit(ip, config)
      expect(result3.success).toBe(true)
      expect(result3.remaining).toBe(0)
    })

    it('should reject requests over limit', async () => {
      const config = { limit: 2, windowMs: 60000, keyPrefix: 'test' }
      const ip = '192.168.1.3'

      await checkRateLimit(ip, config)
      await checkRateLimit(ip, config)
      
      const result = await checkRateLimit(ip, config)
      
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
      expect(result.retryAfter).toBeLessThanOrEqual(60)
    })

    it('should use different counters for different IPs', async () => {
      const config = { limit: 2, windowMs: 60000, keyPrefix: 'test' }

      const result1 = await checkRateLimit('192.168.1.4', config)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(1)

      const result2 = await checkRateLimit('192.168.1.5', config)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(1)
    })

    it('should use different counters for different key prefixes', async () => {
      const ip = '192.168.1.6'

      const result1 = await checkRateLimit(ip, {
        limit: 2,
        windowMs: 60000,
        keyPrefix: 'auth',
      })
      expect(result1.success).toBe(true)

      const result2 = await checkRateLimit(ip, {
        limit: 2,
        windowMs: 60000,
        keyPrefix: 'api',
      })
      expect(result2.success).toBe(true)

      // Both should have 1 remaining
      expect(result1.remaining).toBe(1)
      expect(result2.remaining).toBe(1)
    })

    it('should reset after window expires', async () => {
      const config = { limit: 1, windowMs: 100, keyPrefix: 'test' }
      const ip = '192.168.1.7'

      const result1 = await checkRateLimit(ip, config)
      expect(result1.success).toBe(true)

      const result2 = await checkRateLimit(ip, config)
      expect(result2.success).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      const result3 = await checkRateLimit(ip, config)
      expect(result3.success).toBe(true)
      expect(result3.remaining).toBe(0)
    })

    it('should handle errors gracefully (fail open)', async () => {
      // Mock Redis to throw error
      const mockClient = {
        get: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
        setex: vi.fn(),
        del: vi.fn(),
      }
      vi.mocked(getRedisClient).mockReturnValueOnce(mockClient as any)

      const result = await checkRateLimit('192.168.1.8', {
        limit: 5,
        windowMs: 60000,
      })

      // Should allow request on error
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(5)
    })

    it('should return correct reset timestamp', async () => {
      const now = Date.now()
      const windowMs = 60000
      
      const result = await checkRateLimit('192.168.1.9', {
        limit: 5,
        windowMs,
        keyPrefix: 'test',
      })

      expect(result.reset).toBeGreaterThan(Math.floor(now / 1000))
      expect(result.reset).toBeLessThanOrEqual(Math.floor((now + windowMs + 1000) / 1000))
    })
  })

  describe('resetRateLimit', () => {
    it('should reset rate limit for identifier', async () => {
      const config = { limit: 2, windowMs: 60000, keyPrefix: 'test' }
      const ip = '192.168.1.10'

      await checkRateLimit(ip, config)
      await checkRateLimit(ip, config)
      
      let result = await checkRateLimit(ip, config)
      expect(result.success).toBe(false)

      await resetRateLimit(ip, 'test')

      result = await checkRateLimit(ip, config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(1)
    })
  })

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1',
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.1')
    })

    it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
      const request = new Request('https://example.com', {
        headers: {
          'cf-connecting-ip': '203.0.113.2',
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.2')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-real-ip': '203.0.113.3',
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.3')
    })

    it('should extract IP from x-vercel-forwarded-for header', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-vercel-forwarded-for': '203.0.113.4',
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.4')
    })

    it('should prioritize x-forwarded-for over other headers', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '203.0.113.5',
          'x-real-ip': '203.0.113.6',
          'cf-connecting-ip': '203.0.113.7',
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.5')
    })

    it('should return "unknown" when no IP headers present', () => {
      const request = new Request('https://example.com')

      const ip = getClientIp(request)
      expect(ip).toBe('unknown')
    })

    it('should trim whitespace from x-forwarded-for IPs', () => {
      const request = new Request('https://example.com', {
        headers: {
          'x-forwarded-for': '  203.0.113.8  , 198.51.100.2',
        },
      })

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.8')
    })
  })

  describe('DemoRateLimits configuration', () => {
    it('should have AUTH configuration', () => {
      expect(DemoRateLimits.AUTH).toBeDefined()
      expect(DemoRateLimits.AUTH.limit).toBe(10)
      expect(DemoRateLimits.AUTH.windowMs).toBe(60000)
      expect(DemoRateLimits.AUTH.keyPrefix).toBe('ratelimit:demo:auth')
    })

    it('should have API configuration', () => {
      expect(DemoRateLimits.API).toBeDefined()
      expect(DemoRateLimits.API.limit).toBe(30)
      expect(DemoRateLimits.API.windowMs).toBe(60000)
      expect(DemoRateLimits.API.keyPrefix).toBe('ratelimit:demo:api')
    })

    it('should have EXPORT configuration with stricter limits', () => {
      expect(DemoRateLimits.EXPORT).toBeDefined()
      expect(DemoRateLimits.EXPORT.limit).toBe(3)
      expect(DemoRateLimits.EXPORT.windowMs).toBe(300000) // 5 minutes
      expect(DemoRateLimits.EXPORT.keyPrefix).toBe('ratelimit:demo:export')
    })
  })

  describe('Sliding window behavior', () => {
    it('should maintain accurate count across multiple requests', async () => {
      const config = { limit: 5, windowMs: 60000, keyPrefix: 'test' }
      const ip = '192.168.1.11'

      const results = []
      for (let i = 0; i < 7; i++) {
        results.push(await checkRateLimit(ip, config))
      }

      // First 5 should succeed
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(results[2].success).toBe(true)
      expect(results[3].success).toBe(true)
      expect(results[4].success).toBe(true)

      // 6th and 7th should fail
      expect(results[5].success).toBe(false)
      expect(results[6].success).toBe(false)
    })

    it('should provide accurate remaining count', async () => {
      const config = { limit: 10, windowMs: 60000, keyPrefix: 'test' }
      const ip = '192.168.1.12'

      for (let expected = 9; expected >= 0; expected--) {
        const result = await checkRateLimit(ip, config)
        expect(result.remaining).toBe(expected)
        expect(result.success).toBe(true)
      }

      // Next request should fail with 0 remaining
      const failResult = await checkRateLimit(ip, config)
      expect(failResult.success).toBe(false)
      expect(failResult.remaining).toBe(0)
    })
  })

  describe('WriteRateLimits configuration', () => {
    it('should have CONTACTS configuration', async () => {
      const { WriteRateLimits } = await import('@/lib/rate-limit')
      expect(WriteRateLimits.CONTACTS).toBeDefined()
      expect(WriteRateLimits.CONTACTS.limit).toBe(100)
      expect(WriteRateLimits.CONTACTS.keyPrefix).toBe('ratelimit:write:contacts')
    })

    it('should have DEALS configuration', async () => {
      const { WriteRateLimits } = await import('@/lib/rate-limit')
      expect(WriteRateLimits.DEALS).toBeDefined()
      expect(WriteRateLimits.DEALS.limit).toBe(50)
      expect(WriteRateLimits.DEALS.keyPrefix).toBe('ratelimit:write:deals')
    })

    it('should have IMPORT configuration with stricter limits', async () => {
      const { WriteRateLimits } = await import('@/lib/rate-limit')
      expect(WriteRateLimits.IMPORT).toBeDefined()
      expect(WriteRateLimits.IMPORT.limit).toBe(5)
      expect(WriteRateLimits.IMPORT.keyPrefix).toBe('ratelimit:write:import')
    })

    it('should have EMAIL_LOG configuration', async () => {
      const { WriteRateLimits } = await import('@/lib/rate-limit')
      expect(WriteRateLimits.EMAIL_LOG).toBeDefined()
      expect(WriteRateLimits.EMAIL_LOG.limit).toBe(200)
      expect(WriteRateLimits.EMAIL_LOG.keyPrefix).toBe('ratelimit:write:email')
    })
  })

  describe('withWriteRateLimit middleware', () => {
    it('should allow requests within limit', async () => {
      const { withWriteRateLimit } = await import('@/lib/rate-limit')
      
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      })

      const config = { limit: 5, windowMs: 60000, keyPrefix: 'test-write' }
      const wrapped = withWriteRateLimit(mockHandler, config)

      const request = new Request('https://example.com/api/contacts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.100' },
      })

      const response = await wrapped(request)
      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
      expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('4')
    })

    it('should block requests exceeding limit', async () => {
      const { withWriteRateLimit } = await import('@/lib/rate-limit')
      
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const config = { limit: 2, windowMs: 60000, keyPrefix: 'test-write2' }
      const wrapped = withWriteRateLimit(mockHandler, config)

      const request = new Request('https://example.com/api/contacts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.101' },
      })

      // Make 2 successful requests
      await wrapped(request)
      await wrapped(request)

      // 3rd request should be blocked
      const response = await wrapped(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
      expect(data.retryAfter).toBeGreaterThan(0)
      expect(response.headers.get('Retry-After')).toBeTruthy()
    })

    it('should not call handler when rate limited', async () => {
      const { withWriteRateLimit } = await import('@/lib/rate-limit')
      
      const mockHandler = vi.fn(async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      })

      const config = { limit: 1, windowMs: 60000, keyPrefix: 'test-write3' }
      const wrapped = withWriteRateLimit(mockHandler, config)

      const request = new Request('https://example.com/api/contacts', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.102' },
      })

      await wrapped(request)
      expect(mockHandler).toHaveBeenCalledTimes(1)

      await wrapped(request)
      expect(mockHandler).toHaveBeenCalledTimes(1) // Should not be called again
    })
  })
})
