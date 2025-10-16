import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from './redis'

interface RateLimitEntry {
  requests: number[]
  writes: number[]
  lastCleanup: number
}

interface RateLimitConfig {
  requestsPerMinute: number
  writesPerMinute: number
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when the window resets
  retryAfter?: number // Seconds to wait before retry (only when success=false)
}

export interface SlidingWindowConfig {
  limit: number // Maximum requests allowed in window
  windowMs: number // Time window in milliseconds
  keyPrefix?: string // Redis key prefix (default: 'ratelimit')
}

/**
 * Extended Redis client interface with rate limiting commands
 */
interface RateLimitRedisClient {
  setex(key: string, ttlSeconds: number, value: string): Promise<void>
  get(key: string): Promise<string | null>
  del(key: string): Promise<void>
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig = {
    requestsPerMinute: 60,
    writesPerMinute: 10,
    windowMs: 60 * 1000 // 1 minute
  }) {
    this.config = config

    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    const cutoff = now - this.config.windowMs

    for (const [ip, entry] of Array.from(this.store.entries())) {
      entry.requests = entry.requests.filter(timestamp => timestamp > cutoff)
      entry.writes = entry.writes.filter(timestamp => timestamp > cutoff)

      // Remove empty entries
      if (entry.requests.length === 0 && entry.writes.length === 0) {
        this.store.delete(ip)
      }
    }
  }

  private getEntry(ip: string): RateLimitEntry {
    if (!this.store.has(ip)) {
      this.store.set(ip, {
        requests: [],
        writes: [],
        lastCleanup: Date.now()
      })
    }
    return this.store.get(ip)!
  }

  private cleanOldEntries(entry: RateLimitEntry) {
    const now = Date.now()
    const cutoff = now - this.config.windowMs

    entry.requests = entry.requests.filter(timestamp => timestamp > cutoff)
    entry.writes = entry.writes.filter(timestamp => timestamp > cutoff)
  }

  checkRateLimit(ip: string, isWrite: boolean = false): {
    allowed: boolean
    remainingRequests: number
    remainingWrites: number
    resetTime: number
  } {
    const entry = this.getEntry(ip)
    this.cleanOldEntries(entry)

    const now = Date.now()
    const resetTime = now + this.config.windowMs

    if (isWrite) {
      entry.writes.push(now)
      const writeCount = entry.writes.length

      if (writeCount > this.config.writesPerMinute) {
        return {
          allowed: false,
          remainingRequests: Math.max(0, this.config.requestsPerMinute - entry.requests.length),
          remainingWrites: 0,
          resetTime
        }
      }
    }

    entry.requests.push(now)
    const requestCount = entry.requests.length

    if (requestCount > this.config.requestsPerMinute) {
      return {
        allowed: false,
        remainingRequests: 0,
        remainingWrites: Math.max(0, this.config.writesPerMinute - entry.writes.length),
        resetTime
      }
    }

    return {
      allowed: true,
      remainingRequests: Math.max(0, this.config.requestsPerMinute - requestCount),
      remainingWrites: Math.max(0, this.config.writesPerMinute - entry.writes.length),
      resetTime
    }
  }
}

// Singleton instance for demo rate limiting
const demoRateLimiter = new RateLimiter()

/**
 * Check rate limit using sliding window algorithm with Redis
 * 
 * @param identifier - Unique identifier (usually IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and timing info
 */
export async function checkRateLimit(
  identifier: string,
  config: SlidingWindowConfig
): Promise<RateLimitResult> {
  const { limit, windowMs, keyPrefix = 'ratelimit' } = config
  const redis = getRedisClient() as RateLimitRedisClient
  const key = `${keyPrefix}:${identifier}`
  const now = Date.now()
  const windowSeconds = Math.ceil(windowMs / 1000)

  try {
    // Use manual sliding window implementation with JSON storage
    const currentValue = await redis.get(key)
    
    if (!currentValue) {
      // First request in window
      const data = JSON.stringify({
        count: 1,
        resetAt: now + windowMs,
      })
      await redis.setex(key, windowSeconds, data)
      
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Math.floor((now + windowMs) / 1000),
      }
    }

    // Parse existing data
    const parsed = JSON.parse(currentValue)
    const { count, resetAt } = parsed

    // Check if window has expired
    if (now >= resetAt) {
      // Start new window
      const data = JSON.stringify({
        count: 1,
        resetAt: now + windowMs,
      })
      await redis.setex(key, windowSeconds, data)
      
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Math.floor((now + windowMs) / 1000),
      }
    }

    // Check if limit exceeded
    if (count >= limit) {
      const retryAfter = Math.ceil((resetAt - now) / 1000)
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.floor(resetAt / 1000),
        retryAfter,
      }
    }

    // Increment counter
    const newCount = count + 1
    const data = JSON.stringify({
      count: newCount,
      resetAt,
    })
    const ttl = Math.ceil((resetAt - now) / 1000)
    await redis.setex(key, ttl, data)

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - newCount),
      reset: Math.floor(resetAt / 1000),
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // On error, allow the request (fail open)
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Math.floor((now + windowMs) / 1000),
    }
  }
}

/**
 * Reset rate limit for a given identifier
 * Useful for testing or manual overrides
 * 
 * @param identifier - Unique identifier (e.g., IP address)
 * @param keyPrefix - Redis key prefix (default: 'ratelimit')
 */
export async function resetRateLimit(
  identifier: string,
  keyPrefix: string = 'ratelimit'
): Promise<void> {
  const redis = getRedisClient()
  const key = `${keyPrefix}:${identifier}`
  await redis.del(key)
}

/**
 * Get client IP address from request
 * Handles proxy headers (X-Forwarded-For, X-Real-IP)
 * 
 * @param request - Next.js request object or Headers
 * @returns IP address or 'unknown'
 */
export function getClientIp(request: Request | NextRequest): string {
  // Try various headers that might contain the real IP
  const headers = request.headers
  
  // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2)
  // The first one is typically the real client IP
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    return ips[0]
  }

  // Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // X-Real-IP (nginx)
  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Vercel
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for')
  if (vercelForwardedFor) {
    return vercelForwardedFor
  }

  return 'unknown'
}

/**
 * Predefined rate limit configurations for demo sessions
 */
export const DemoRateLimits = {
  // Demo authentication endpoints - strict limits
  AUTH: {
    limit: 10, // 10 requests
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'ratelimit:demo:auth',
  } as SlidingWindowConfig,
  // Demo API endpoints - moderate limits
  API: {
    limit: 30, // 30 requests
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'ratelimit:demo:api',
  } as SlidingWindowConfig,
  // Demo data export - very strict
  EXPORT: {
    limit: 3, // 3 exports
    windowMs: 5 * 60 * 1000, // per 5 minutes
    keyPrefix: 'ratelimit:demo:export',
  } as SlidingWindowConfig,
} as const

export function checkDemoRateLimit(request: NextRequest, isWrite: boolean = false, limiter?: RateLimiter) {
  const limiterToUse = limiter || demoRateLimiter
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             '127.0.0.1'

  const result = limiterToUse.checkRateLimit(ip, isWrite)

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: isWrite
          ? 'Too many write operations. Please try again later.'
          : 'Too many requests. Please try again later.',
        retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining-Requests': result.remainingRequests.toString(),
          'X-RateLimit-Remaining-Writes': result.remainingWrites.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        }
      }
    )
  }

  return null // Allowed
}

export { RateLimiter }