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
  burst?: number // optional burst capacity (handled by callers)
}

/**
 * Extended Redis client interface with rate limiting commands
 */
interface RateLimitRedisClient {
  setex(key: string, ttlSeconds: number, value: string): Promise<void>
  get(key: string): Promise<string | null>
  del(key: string): Promise<void>
}

// Lightweight in-memory store for sliding-window counts used when RATE_LIMIT_ADAPTER=memory
const memoryStore = new Map<string, number[]>()

class RateLimiter {
  // legacy in-memory limiter (kept for demo helpers). Not used by checkRateLimit when adapter=memory.
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

// Singleton instance for demo rate limiting (in-memory)
const demoRateLimiter = new RateLimiter()

// Adapter selection: evaluate at call-time so tests can change the env dynamically
function getAdapter() {
  return (process.env.RATE_LIMIT_ADAPTER || 'redis')
}

function getInMemoryLimiter() {
  return demoRateLimiter
}

function getRedisClientOrNull() {
  try {
    return getRedisClient()
  } catch (e) {
    return null
  }
}

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
  const now = Date.now()
  const windowSeconds = Math.ceil(windowMs / 1000)

  // DEBUG: log adapter selection and key for troubleshooting failing tests
  try {
    // eslint-disable-next-line no-console
    console.debug(`[rate-limit] adapter=${getAdapter()} keyPrefix=${keyPrefix} identifier=${identifier}`)
  } catch {}

  // If adapter is memory, use in-memory sliding window keyed by keyPrefix:identifier
  const effectivePrefix = keyPrefix || 'ratelimit'
  if (getAdapter() === 'memory') {
    try {
      const key = `${effectivePrefix}:${identifier}`
      const cutoff = now - windowMs
      // Read existing timestamps first
      const existing = (memoryStore.get(key) || []).filter((t) => t > cutoff)

      // Compute what the new count would be if we allowed this request
      const hypotheticalList = existing.concat([now])
      const current = hypotheticalList.length
      const oldest = hypotheticalList[0] || now
      const resetMs = oldest + windowMs
      const allowed = current <= limit
      const remaining = Math.max(0, limit - current)
      const retryAfter = allowed ? undefined : Math.ceil((resetMs - now) / 1000)

      // Only persist the new timestamp after all reads and computations succeeded
      // (this avoids consuming a token if something throws)
      memoryStore.set(key, hypotheticalList)

      return {
        success: allowed,
        limit,
        remaining,
        reset: Math.floor(resetMs / 1000),
        retryAfter,
      }
    } catch (e) {
      console.error('In-memory rate limit check failed:', e)
      // Fail-open: do not consume a token when the in-memory logic errors
      return {
        success: true,
        limit,
        remaining: limit,
        reset: Math.floor((now + windowMs) / 1000),
        retryAfter: undefined,
      }
    }
  }

  // Default: use Redis-backed sliding window
  const redis = getRedisClientOrNull() as RateLimitRedisClient | null
  if (!redis) {
    // Redis not available; fail-open (do not consume tokens)
    console.warn('Redis client not available for rate limiting; failing open for this check')
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Math.floor((now + windowMs) / 1000),
      retryAfter: undefined,
    }
  }

  const effectivePrefixRedis = keyPrefix || 'ratelimit'
  const key = `${effectivePrefixRedis}:${identifier}`

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
  const key = `${keyPrefix}:${identifier}`

  // Always clear in-memory store (safe no-op if not present)
  try {
    memoryStore.delete(key)
  } catch (e) {
    // ignore
  }

  // Also attempt to clear Redis entry if available
  try {
    const redis = getRedisClientOrNull()
    if (redis) {
      await redis.del(key)
    }
  } catch (e) {
    // ignore
  }
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

/**
 * Rate limit configurations for write endpoints
 * Each config has a base limit and a burst limit (for short spikes)
 */
export const WriteRateLimits = {
  // Contact creation/updates
  CONTACTS: {
    limit: 100, // 100 writes per minute (normal)
    burst: 120, // Allow burst up to 120
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'ratelimit:write:contacts',
  } as SlidingWindowConfig & { burst: number },
  // Deal creation/updates
  DEALS: {
    limit: 50, // 50 writes per minute
    burst: 120, // Allow burst up to 120
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'ratelimit:write:deals',
  } as SlidingWindowConfig & { burst: number },
  // Bulk imports
  IMPORT: {
    limit: 5, // 5 imports per minute (strict)
    burst: 120, // Allow burst up to 120
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'ratelimit:write:import',
  } as SlidingWindowConfig & { burst: number },
  // Email log ingestion
  EMAIL_LOG: {
    limit: 200, // 200 emails per minute
  // Keep burst handling but ensure it's >= limit so short bursts are allowed
  burst: 120, // Allow burst up to 120
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'ratelimit:write:email',
  } as SlidingWindowConfig & { burst: number },
  // Company creation/updates
  COMPANIES: {
    limit: 60, // 60 writes per minute
    burst: 120, // Allow burst up to 120
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'ratelimit:write:companies',
  } as SlidingWindowConfig & { burst: number },
  // Pipeline creation/updates
  PIPELINES: {
    limit: 60, // 60 writes per minute
    burst: 120, // Allow burst up to 120
    windowMs: 60 * 1000, // per minute
    keyPrefix: 'ratelimit:write:pipelines',
  } as SlidingWindowConfig & { burst: number },
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

/**
 * Check rate limit for both IP and organization
 * Uses the more restrictive limit of the two
 * 
 * @param clientIp - Client IP address
 * @param orgId - Organization ID (optional)
 * @param config - Rate limit configuration
 * @returns Combined rate limit result
 */
export async function checkCombinedRateLimit(
  clientIp: string,
  orgId: string | null,
  config: SlidingWindowConfig & { burst?: number }
): Promise<RateLimitResult> {
  // Ensure we always have a sane key prefix
  const basePrefix = config.keyPrefix || 'ratelimit'

  // Check IP-based rate limit (uses burst limit if available)
  const burstLimit = config.burst || config.limit
  const ipResult = await checkRateLimit(clientIp, {
    ...config,
    limit: burstLimit,
    keyPrefix: `${basePrefix}:ip`,
  })

  // If organization ID provided, also check org-based limit
  if (orgId) {
    const orgResult = await checkRateLimit(orgId, {
      ...config,
      keyPrefix: `${basePrefix}:org`,
    })

    // Return the more restrictive result
    if (!ipResult.success || !orgResult.success) {
      return {
        success: false,
        limit: config.limit,
        // Clamp remaining to the configured (non-burst) limit
        remaining: Math.min(ipResult.remaining, orgResult.remaining, config.limit),
        // reset should be the later reset time among the two
        reset: Math.max(ipResult.reset, orgResult.reset),
        // retryAfter should be the max positive value (or undefined if both undefined)
        retryAfter: Math.max(ipResult.retryAfter || 0, orgResult.retryAfter || 0) || undefined,
      }
    }

    // Both passed - return the more restrictive remaining count, normalize limit to config.limit
    return {
      success: true,
      limit: config.limit,
      remaining: Math.min(ipResult.remaining, orgResult.remaining, config.limit),
      reset: Math.max(ipResult.reset, orgResult.reset),
    }
  }

  // Only IP-based check
  return {
    success: ipResult.success,
    // Normalize to configured (non-burst) limit when returning to callers
    limit: config.limit,
    remaining: Math.min(ipResult.remaining, config.limit),
    reset: ipResult.reset,
    retryAfter: ipResult.retryAfter,
  }
}

/**
 * Middleware wrapper for write endpoints with rate limiting
 * Checks both IP and organization-based limits
 * 
 * @param handler - The actual route handler
 * @param config - Rate limit configuration
 * @param getOrgId - Optional function to extract org ID from request
 * @returns Wrapped handler with rate limiting
 * 
 * @example
 * export const POST = withWriteRateLimit(
 *   async (req) => {
 *     // Your handler code
 *     return NextResponse.json({ success: true });
 *   },
 *   WriteRateLimits.CONTACTS,
 *   async (req) => {
 *     const session = await getServerSession(authOptions);
 *     return session?.user?.currentOrg?.id || null;
 *   }
 * );
 */
export function withWriteRateLimit<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<T>>,
  config: SlidingWindowConfig & { burst?: number },
  getOrgId?: (req: NextRequest) => Promise<string | null>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse<T>> => {
    // Clone request to avoid consuming the body twice (handlers may read it)
  // clone() returns a standard Request; cast to NextRequest for typing
  const reqForOrg = (req.clone() as unknown) as NextRequest
    const clientIp = getClientIp(req)
    const orgId = getOrgId ? await getOrgId(reqForOrg) : null
    
    // Check combined rate limit (IP + Org)
    const rateLimitResult = await checkCombinedRateLimit(clientIp, orgId, config)
    
    if (!rateLimitResult.success) {
      // Build headers safely (HeadersInit cannot contain undefined values)
      const retryAfterStr = rateLimitResult.retryAfter != null
        ? rateLimitResult.retryAfter.toString()
        : (rateLimitResult.reset ? Math.max(0, Math.ceil(rateLimitResult.reset - Math.floor(Date.now() / 1000))).toString() : undefined)

      const headers: Record<string, string> = {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        'X-RateLimit-Scope': orgId ? 'ip+org' : 'ip',
      }

      if (retryAfterStr) headers['Retry-After'] = retryAfterStr

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down and try again.',
          retryAfter: rateLimitResult.retryAfter,
          limit: rateLimitResult.limit,
          reset: rateLimitResult.reset,
        } as any,
        {
          status: 429,
          headers,
        }
      )
    }
    
  // If the handler wants to run, call it with the original request
  // (we cloned earlier to permit body reads in getOrgId)
  const response = await handler(req, context)
    const headers = new Headers(response.headers)
    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())
    headers.set('X-RateLimit-Scope', orgId ? 'ip+org' : 'ip')
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

export { RateLimiter }