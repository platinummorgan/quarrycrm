import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { RateLimiter, checkDemoRateLimit } from '@/lib/rate-limit'

// Mock NextRequest
const createMockRequest = (ip: string = '127.0.0.1'): any => ({
  headers: {
    get: (name: string) => {
      if (name === 'x-forwarded-for') return ip
      if (name === 'x-real-ip') return ip
      return null
    },
  },
})

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({
      requestsPerMinute: 5, // Lower limits for testing
      writesPerMinute: 2,
      windowMs: 60 * 1000,
    })
  })

  it('should allow requests within limits', () => {
    const ip = '127.0.0.1'

    // Should allow 5 requests
    for (let i = 0; i < 5; i++) {
      const result = limiter.checkRateLimit(ip, false)
      expect(result.allowed).toBe(true)
      expect(result.remainingRequests).toBe(5 - i - 1)
    }

    // 6th request should be blocked
    const result = limiter.checkRateLimit(ip, false)
    expect(result.allowed).toBe(false)
    expect(result.remainingRequests).toBe(0)
  })

  it('should allow writes within limits', () => {
    const ip = '127.0.0.1'

    // Should allow 2 writes
    for (let i = 0; i < 2; i++) {
      const result = limiter.checkRateLimit(ip, true)
      expect(result.allowed).toBe(true)
      expect(result.remainingWrites).toBe(2 - i - 1)
    }

    // 3rd write should be blocked
    const result = limiter.checkRateLimit(ip, true)
    expect(result.allowed).toBe(false)
    expect(result.remainingWrites).toBe(0)
  })

  it('should track reads and writes separately', () => {
    const ip = '127.0.0.1'

    // Use up write limit
    limiter.checkRateLimit(ip, true)
    limiter.checkRateLimit(ip, true)

    // Should still allow reads (writes count as requests too, so we have 3 requests used: 2 writes + 1 read)
    const readResult = limiter.checkRateLimit(ip, false)
    expect(readResult.allowed).toBe(true)
    expect(readResult.remainingWrites).toBe(0) // Writes exhausted
    expect(readResult.remainingRequests).toBe(2) // 5 - 3 = 2 remaining
  })

  it('should clean up old entries', () => {
    const ip = '127.0.0.1'

    // Add some requests
    limiter.checkRateLimit(ip, false)
    limiter.checkRateLimit(ip, false)

    // Mock time passing (simulate cleanup)
    vi.useFakeTimers()
    vi.advanceTimersByTime(61 * 1000) // Past the window

    // Should allow new requests after cleanup
    const result = limiter.checkRateLimit(ip, false)
    expect(result.allowed).toBe(true)

    vi.useRealTimers()
  })

  it('should handle different IPs separately', () => {
    const ip1 = '127.0.0.1'
    const ip2 = '127.0.0.2'

    // Exhaust ip1 limit
    for (let i = 0; i < 5; i++) {
      limiter.checkRateLimit(ip1, false)
    }

    // ip2 should still be allowed
    const result = limiter.checkRateLimit(ip2, false)
    expect(result.allowed).toBe(true)
    expect(result.remainingRequests).toBe(4)
  })
})

describe('checkDemoRateLimit', () => {
  beforeEach(() => {
    // Reset rate limiter for each test
    vi.resetModules()
  })

  it('should return null for allowed requests', () => {
    const request = createMockRequest('127.0.0.1')
    const result = checkDemoRateLimit(request, false)
    expect(result).toBeNull()
  })

  it('should return 429 response when rate limited', async () => {
    const request = createMockRequest('10.0.0.1')

    // Create a test limiter with lower limits for testing
    const testLimiter = new RateLimiter({
      requestsPerMinute: 2,
      writesPerMinute: 1,
      windowMs: 60 * 1000,
    })

    // Exhaust the limit
    checkDemoRateLimit(request, false, testLimiter)
    checkDemoRateLimit(request, false, testLimiter)

    // Next request should be blocked
    const result = checkDemoRateLimit(request, false, testLimiter)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(429)

    const body = await result?.json()
    expect(body).toMatchObject({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: expect.any(Number),
    })
  })

  it('should return 429 response when write limit exceeded', async () => {
    const request = createMockRequest('10.0.0.2')

    // Create a test limiter with lower limits for testing
    const testLimiter = new RateLimiter({
      requestsPerMinute: 5,
      writesPerMinute: 1,
      windowMs: 60 * 1000,
    })

    // Exhaust the write limit
    checkDemoRateLimit(request, true, testLimiter)

    // Next write should be blocked
    const result = checkDemoRateLimit(request, true, testLimiter)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(429)

    const body = await result?.json()
    expect(body).toMatchObject({
      error: 'Rate limit exceeded',
      message: 'Too many write operations. Please try again later.',
      retryAfter: expect.any(Number),
    })
  })

  it('should include proper headers in rate limit response', async () => {
    const request = createMockRequest('10.0.0.3')

    // Create a test limiter with lower limits for testing
    const testLimiter = new RateLimiter({
      requestsPerMinute: 1,
      writesPerMinute: 1,
      windowMs: 60 * 1000,
    })

    // Exhaust the limit
    checkDemoRateLimit(request, false, testLimiter)

    const result = checkDemoRateLimit(request, false, testLimiter)
    expect(result?.headers.get('Content-Type')).toBe('application/json')
    expect(result?.headers.get('Retry-After')).toBeDefined()
    expect(result?.headers.get('X-RateLimit-Remaining-Requests')).toBe('0')
    expect(result?.headers.get('X-RateLimit-Remaining-Writes')).toBeDefined()
    expect(result?.headers.get('X-RateLimit-Reset')).toBeDefined()
  })

  it('should handle different IP headers', () => {
    // Test x-forwarded-for
    const request1 = {
      headers: {
        get: (name: string) => name === 'x-forwarded-for' ? '192.168.1.1' : null,
      },
    } as any

    const result1 = checkDemoRateLimit(request1, false)
    expect(result1).toBeNull()

    // Test x-real-ip
    const request2 = {
      headers: {
        get: (name: string) => name === 'x-real-ip' ? '192.168.1.2' : null,
      },
    } as any

    const result2 = checkDemoRateLimit(request2, false)
    expect(result2).toBeNull()

    // Test fallback to 127.0.0.1
    const request3 = {
      headers: {
        get: () => null,
      },
    } as any

    const result3 = checkDemoRateLimit(request3, false)
    expect(result3).toBeNull()
  })
})