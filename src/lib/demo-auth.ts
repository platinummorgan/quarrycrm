import { SignJWT, jwtVerify } from 'jose'
import { randomBytes } from 'crypto'
import { storeTokenJti, isTokenUsed } from './redis'

export interface DemoTokenPayload {
  orgId: string
  role: 'demo'
  jti: string // Unique token identifier for replay protection
  iat: number
  exp: number
  host?: string // Expected host for host pinning
}

const DEMO_TOKEN_SECRET = process.env.DEMO_TOKEN_SECRET
const DEMO_TOKEN_EXPIRY = 15 * 60 // 15 minutes in seconds (MAX)
const MAX_IAT_SKEW = 60 // Maximum allowed time skew in seconds (1 minute)

if (!DEMO_TOKEN_SECRET) {
  throw new Error('DEMO_TOKEN_SECRET environment variable is required')
}

/**
 * Generate a signed JWT for demo access with replay protection
 * @param orgId - Organization ID
 * @param host - Optional host for host pinning
 */
export async function generateDemoToken(orgId: string, host?: string): Promise<string> {
  const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)
  const jti = randomBytes(16).toString('hex') // Unique nonce

  const payload: Record<string, any> = {
    orgId,
    role: 'demo' as const,
    jti,
  }

  if (host) {
    payload.host = host
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() / 1000 + DEMO_TOKEN_EXPIRY)
    .sign(secret)

  return token
}

/**
 * Verify and decode a demo token with strict security checks:
 * - Expiration must be ≤ 15 minutes
 * - IAT skew validation (max 1 minute in future)
 * - Replay protection via JTI
 * - Optional host pinning
 * 
 * @param token - JWT token to verify
 * @param expectedHost - Expected host for host pinning (optional)
 * @throws Error if token is invalid, expired, replayed, or host mismatch
 */
export async function verifyDemoToken(
  token: string,
  expectedHost?: string
): Promise<DemoTokenPayload> {
  const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })

    // Validate payload structure
    if (
      typeof payload.orgId !== 'string' ||
      payload.role !== 'demo' ||
      typeof payload.jti !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new Error('Invalid token payload structure')
    }

    const now = Math.floor(Date.now() / 1000)

    // 1. Verify expiration is not too far in the future (max 15 minutes)
    const tokenLifetime = payload.exp - payload.iat
    if (tokenLifetime > DEMO_TOKEN_EXPIRY) {
      throw new Error('Token expiration exceeds maximum allowed duration (15 minutes)')
    }

    // 2. Verify token is not expired
    if (now >= payload.exp) {
      throw new Error('Token has expired')
    }

    // 3. Verify IAT is not too far in the future (clock skew protection)
    if (payload.iat > now + MAX_IAT_SKEW) {
      throw new Error(`Token issued-at time is too far in the future (max skew: ${MAX_IAT_SKEW}s)`)
    }

    // 4. Verify IAT is not too old (should be recent)
    if (now - payload.iat > DEMO_TOKEN_EXPIRY) {
      throw new Error('Token issued-at time is too old')
    }

    // 5. Check for token replay (JTI must not be reused)
    const wasUsed = await isTokenUsed(payload.jti)
    if (wasUsed) {
      throw new Error('Token has already been used (replay attack detected)')
    }

    // 6. Host pinning validation (if enabled)
    if (expectedHost && payload.host && typeof payload.host === 'string') {
      // Normalize hosts (remove protocol, port, trailing slash)
      const normalizeHost = (h: string) => {
        return h
          .replace(/^https?:\/\//, '')
          .replace(/:\d+$/, '')
          .replace(/\/$/, '')
          .toLowerCase()
      }

      const normalizedExpected = normalizeHost(expectedHost)
      const normalizedToken = normalizeHost(payload.host)

      if (normalizedExpected !== normalizedToken) {
        throw new Error(`Token host mismatch: expected ${normalizedExpected}, got ${normalizedToken}`)
      }
    }

    // 7. Store JTI to prevent replay (TTL = remaining token lifetime)
    const remainingTtl = payload.exp - now
    await storeTokenJti(payload.jti, remainingTtl)

    return {
      orgId: payload.orgId,
      role: payload.role,
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
      host: payload.host as string | undefined,
    } as DemoTokenPayload
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid demo token: ${error.message}`)
    }
    throw new Error('Invalid or expired demo token')
  }
}

/**
 * Check if a token is expired
 */
export function isDemoTokenExpired(token: DemoTokenPayload): boolean {
  return Math.floor(Date.now() / 1000) >= token.exp
}