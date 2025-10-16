# Demo Token Security - Code Diffs

## File 1: Redis Client (NEW FILE)

**Path**: `src/lib/redis.ts`

```typescript
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

export function getRedisClient(): RedisClient {
  if (redisClient) return redisClient

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

export async function storeTokenJti(jti: string, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient()
  const key = `demo:token:${jti}`
  await redis.setex(key, ttlSeconds, '1')
}

export async function isTokenUsed(jti: string): Promise<boolean> {
  const redis = getRedisClient()
  const key = `demo:token:${jti}`
  const value = await redis.get(key)
  return value !== null
}
```

---

## File 2: Demo Authentication

**Path**: `src/lib/demo-auth.ts`

### Imports Section
```diff
 import { SignJWT, jwtVerify } from 'jose'
+import { randomBytes } from 'crypto'
+import { storeTokenJti, isTokenUsed } from './redis'
```

### Interface Definition
```diff
 export interface DemoTokenPayload {
   orgId: string
   role: 'demo'
+  jti: string // Unique token identifier for replay protection
   iat: number
   exp: number
+  host?: string // Expected host for host pinning
 }
```

### Constants
```diff
 const DEMO_TOKEN_SECRET = process.env.DEMO_TOKEN_SECRET
-const DEMO_TOKEN_EXPIRY = 15 * 60 // 15 minutes in seconds
+const DEMO_TOKEN_EXPIRY = 15 * 60 // 15 minutes in seconds (MAX)
+const MAX_IAT_SKEW = 60 // Maximum allowed time skew in seconds (1 minute)
```

### Token Generation
```diff
-export async function generateDemoToken(orgId: string): Promise<string> {
+export async function generateDemoToken(orgId: string, host?: string): Promise<string> {
   const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
+  const jti = randomBytes(16).toString('hex') // Unique nonce

-  const token = await new SignJWT({
-    orgId,
-    role: 'demo' as const,
-  })
+  const payload: Record<string, any> = {
+    orgId,
+    role: 'demo' as const,
+    jti,
+  }
+
+  if (host) {
+    payload.host = host
+  }
+
+  const token = await new SignJWT(payload)
     .setProtectedHeader({ alg: 'HS256' })
     .setIssuedAt()
     .setExpirationTime(Date.now() / 1000 + DEMO_TOKEN_EXPIRY)
     .sign(secret)

   return token
 }
```

### Token Verification
```diff
-export async function verifyDemoToken(token: string): Promise<DemoTokenPayload> {
+export async function verifyDemoToken(
+  token: string,
+  expectedHost?: string
+): Promise<DemoTokenPayload> {
   const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)

   try {
     const { payload } = await jwtVerify(token, secret, {
       algorithms: ['HS256'],
     })

     // Validate payload structure
     if (
       typeof payload.orgId !== 'string' ||
       payload.role !== 'demo' ||
+      typeof payload.jti !== 'string' ||
       typeof payload.iat !== 'number' ||
       typeof payload.exp !== 'number'
     ) {
-      throw new Error('Invalid token payload')
+      throw new Error('Invalid token payload structure')
     }

+    const now = Math.floor(Date.now() / 1000)
+
+    // 1. Verify expiration is not too far in the future (max 15 minutes)
+    const tokenLifetime = payload.exp - payload.iat
+    if (tokenLifetime > DEMO_TOKEN_EXPIRY) {
+      throw new Error('Token expiration exceeds maximum allowed duration (15 minutes)')
+    }
+
+    // 2. Verify token is not expired
+    if (now >= payload.exp) {
+      throw new Error('Token has expired')
+    }
+
+    // 3. Verify IAT is not too far in the future (clock skew protection)
+    if (payload.iat > now + MAX_IAT_SKEW) {
+      throw new Error(`Token issued-at time is too far in the future (max skew: ${MAX_IAT_SKEW}s)`)
+    }
+
+    // 4. Verify IAT is not too old (should be recent)
+    if (now - payload.iat > DEMO_TOKEN_EXPIRY) {
+      throw new Error('Token issued-at time is too old')
+    }
+
+    // 5. Check for token replay (JTI must not be reused)
+    const wasUsed = await isTokenUsed(payload.jti)
+    if (wasUsed) {
+      throw new Error('Token has already been used (replay attack detected)')
+    }
+
+    // 6. Host pinning validation (if enabled)
+    if (expectedHost && payload.host && typeof payload.host === 'string') {
+      // Normalize hosts (remove protocol, port, trailing slash)
+      const normalizeHost = (h: string) => {
+        return h
+          .replace(/^https?:\/\//, '')
+          .replace(/:\d+$/, '')
+          .replace(/\/$/, '')
+          .toLowerCase()
+      }
+
+      const normalizedExpected = normalizeHost(expectedHost)
+      const normalizedToken = normalizeHost(payload.host)
+
+      if (normalizedExpected !== normalizedToken) {
+        throw new Error(`Token host mismatch: expected ${normalizedExpected}, got ${normalizedToken}`)
+      }
+    }
+
+    // 7. Store JTI to prevent replay (TTL = remaining token lifetime)
+    const remainingTtl = payload.exp - now
+    await storeTokenJti(payload.jti, remainingTtl)

     return {
       orgId: payload.orgId,
       role: payload.role,
+      jti: payload.jti,
       iat: payload.iat,
       exp: payload.exp,
+      host: payload.host as string | undefined,
     } as DemoTokenPayload
   } catch (error) {
+    if (error instanceof Error) {
+      throw new Error(`Invalid demo token: ${error.message}`)
+    }
     throw new Error('Invalid or expired demo token')
   }
 }
```

### Helper Function
```diff
 export function isDemoTokenExpired(token: DemoTokenPayload): boolean {
-  return Date.now() / 1000 > token.exp
+  return Math.floor(Date.now() / 1000) >= token.exp
 }
```

---

## File 3: NextAuth Configuration

**Path**: `src/lib/auth.ts`

```diff
     CredentialsProvider({
       id: 'demo',
       name: 'Demo',
       credentials: {
         token: { label: 'Demo Token', type: 'text' },
+        host: { label: 'Host', type: 'text' }, // Optional host for pinning
       },
       async authorize(credentials) {
-        console.log('Demo provider authorize called with credentials:', !!credentials?.token)
+        console.log('🔍 Demo provider authorize called with credentials:', !!credentials?.token)
         if (!credentials?.token) {
-          console.log('No token provided')
+          console.log('❌ No token provided')
           return null
         }

         try {
-          console.log('Verifying demo token...')
-          // Verify the demo token
-          const payload = await verifyDemoToken(credentials.token)
-          console.log('Token verified, orgId:', payload.orgId)
+          console.log('🔍 Verifying demo token with security checks...')
+          
+          // Verify the demo token with host pinning if provided
+          const expectedHost = credentials.host || process.env.NEXTAUTH_URL || undefined
+          console.log('🔍 Expected host for token:', expectedHost)
+          
+          const payload = await verifyDemoToken(credentials.token, expectedHost)
+          console.log('✅ Token verified successfully, orgId:', payload.orgId, 'jti:', payload.jti)

           // Find the demo user
           const demoUser = await prisma.user.findFirst({
             where: { email: 'demo@demo.example' },
           })
-          console.log('Demo user found:', !!demoUser)
+          console.log('🔍 Demo user found:', !!demoUser)

           if (!demoUser) {
             throw new Error('Demo user not found')
           }

           // ... membership upsert code ...

-          console.log('Demo membership ready:', !!membership)
+          console.log('✅ Demo membership ready:', !!membership)

-          console.log('Demo auth successful, returning user object')
+          console.log('✅ Demo auth successful, returning user object')
           return {
             id: demoUser.id,
             email: demoUser.email,
             name: demoUser.name,
             isDemo: true,
             demoOrgId: payload.orgId,
           }
         } catch (error) {
-          console.error('Demo auth error:', error)
+          console.error('❌ Demo auth error:', error)
           return null
         }
       },
     }),
```

---

## File 4: Demo Route Handler

**Path**: `src/app/demo/route.ts`

```diff
 export async function GET(request: NextRequest) {
   try {
     // Find the Quarry Demo organization
     const demoOrg = await prisma.organization.findFirst({
       where: { name: 'Quarry Demo' },
     })

     if (!demoOrg) {
       return NextResponse.json(
         { error: 'Demo organization not found. Please run the demo seed script first.' },
         { status: 404 }
       )
     }

+    // Get current host for host pinning
+    const requestUrl = new URL(request.url)
+    const host = requestUrl.host
+
-    // Generate demo token
-    const token = await generateDemoToken(demoOrg.id)
+    // Generate demo token with host pinning
+    const token = await generateDemoToken(demoOrg.id, host)

     // Create redirect URL with token
-    const baseUrl = new URL(request.url).origin
+    const baseUrl = requestUrl.origin
     const redirectUrl = new URL('/api/auth/demo', baseUrl)
     redirectUrl.searchParams.set('token', token)

     return NextResponse.redirect(redirectUrl)
   } catch (error) {
     console.error('Demo route error:', error)
     return NextResponse.json(
       { error: 'Failed to generate demo token' },
       { status: 500 }
     )
   }
 }
```

---

## File 5: Demo Signin Page

**Path**: `src/app/auth/demo-signin/page.tsx`

```diff
     const performDemoSignin = async () => {
       const timeoutId = window.setTimeout(() => {
         console.error('Demo signin timeout - session not established')
         setError('Demo signin failed - no session established.')
         setLoading(false)
       }, 4000)

       try {
         setLoading(true)
         setSigninAttempted(true)
         console.log('Attempting demo signin with token:', token.substring(0, 10) + '...')

+        // Get current host for host pinning
+        const currentHost = window.location.host
+
         const result = await signIn('demo', {
           token,
+          host: currentHost, // Pass host for validation
           redirect: false,
           callbackUrl: '/app',
         })

         console.log('Demo signin result:', result)
```

---

## Test File (NEW)

**Path**: `__tests__/demo-token-security.test.ts`

See separate test file (380+ lines, 40+ tests covering all security features)

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Files Modified** | 5 |
| **New Files** | 2 |
| **Lines Added** | ~1,100 |
| **Security Checks Added** | 7 |
| **Test Cases** | 40+ |
| **Test Suites** | 9 |

## Security Validations Added

1. ✅ Token lifetime ≤ 15 minutes
2. ✅ Token not expired
3. ✅ IAT not in future (> 60s)
4. ✅ IAT not too old (> 15 min)
5. ✅ JTI not reused (replay protection)
6. ✅ Host matches (if pinning enabled)
7. ✅ Payload structure valid
