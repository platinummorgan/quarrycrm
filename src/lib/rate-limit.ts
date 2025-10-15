import { NextRequest, NextResponse } from 'next/server'

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