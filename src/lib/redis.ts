/**
 * Redis client for token replay protection and caching
 * 
 * For production: Use Upstash Redis or Redis Labs
 * For development: Falls back to in-memory Map (not distributed)
 */

interface RedisClient {
  setex(key: string, ttlSeconds: number, value: string): Promise<void>
  get(key: string): Promise<string | null>
  del(key: string): Promise<void>
}

class InMemoryRedis implements RedisClient {
  private store = new Map<string, { value: string; expiresAt: number }>()

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000
    this.store.set(key, { value, expiresAt })
    
    // Clean up expired entries periodically
    setTimeout(() => {
      const entry = this.store.get(key)
      if (entry && Date.now() >= entry.expiresAt) {
        this.store.delete(key)
      }
    }, ttlSeconds * 1000)
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    
    return entry.value
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }
}

// Upstash Redis client (optional)
class UpstashRedis implements RedisClient {
  private baseUrl: string
  private token: string

  constructor(url: string, token: string) {
    this.baseUrl = url
    this.token = token
  }

  private async request(command: string[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([command]),
    })

    if (!response.ok) {
      throw new Error(`Redis request failed: ${response.statusText}`)
    }

    const [result] = await response.json()
    return result.result
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.request(['SETEX', key, ttlSeconds.toString(), value])
  }

  async get(key: string): Promise<string | null> {
    const result = await this.request(['GET', key])
    return result
  }

  async del(key: string): Promise<void> {
    await this.request(['DEL', key])
  }
}

let redisClient: RedisClient | null = null

/**
 * Get or create Redis client singleton
 */
export function getRedisClient(): RedisClient {
  if (redisClient) return redisClient

  // Try to use Upstash Redis if configured
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashUrl && upstashToken) {
    console.log('Using Upstash Redis for token storage')
    redisClient = new UpstashRedis(upstashUrl, upstashToken)
  } else {
    console.warn('Redis not configured, using in-memory store (not suitable for production)')
    redisClient = new InMemoryRedis()
  }

  return redisClient
}

/**
 * Store a token's JTI (nonce) to prevent replay attacks
 * @param jti - Unique token identifier
 * @param ttlSeconds - Time to live in seconds
 */
export async function storeTokenJti(jti: string, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient()
  const key = `demo:token:${jti}`
  await redis.setex(key, ttlSeconds, '1')
}

/**
 * Check if a token's JTI has already been used
 * @param jti - Unique token identifier
 * @returns true if token was already used
 */
export async function isTokenUsed(jti: string): Promise<boolean> {
  const redis = getRedisClient()
  const key = `demo:token:${jti}`
  const value = await redis.get(key)
  return value !== null
}
