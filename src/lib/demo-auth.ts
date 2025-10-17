import { randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { storeTokenJti, isTokenUsed } from './redis'

export interface DemoTokenPayload {
  orgId: string
  role: 'demo'
  jti: string // Unique token identifier for replay protection
  iat: number
  exp: number
  host?: string // Normalized host (no www, no port)
}

const DEMO_TOKEN_SECRET = process.env.DEMO_TOKEN_SECRET || ''
const DEMO_TOKEN_EXPIRY = 15 * 60 // 15 minutes in seconds (MAX)
const MAX_IAT_SKEW = 60 // Maximum allowed time skew in seconds (1 minute)

if (!DEMO_TOKEN_SECRET) {
  throw new Error('DEMO_TOKEN_SECRET environment variable is required')
}

function isHex64(v: string) {
  return /^[0-9a-fA-F]{64}$/.test(v)
}

function isBase64(v: string) {
  // loose base64 detection: contains +/ or ends with = padding
  return /^[A-Za-z0-9+/]+=*$/.test(v)
}

export function getHmacKey(secretEnv: string): Uint8Array {
  if (isHex64(secretEnv)) {
    // hex
    const buf = Buffer.from(secretEnv, 'hex')
    return new Uint8Array(buf)
  }

  if (isBase64(secretEnv)) {
    const buf = Buffer.from(secretEnv, 'base64')
    return new Uint8Array(buf)
  }

  // plain string
  return new TextEncoder().encode(secretEnv)
}

function normalizeHost(h: string): string {
  if (!h) return ''
  try {
    // If h is a full URL, extract hostname
    const u = new URL(h)
    return u.hostname.replace(/^www\./i, '').toLowerCase()
  } catch (e) {
    // Not a full URL; strip protocol, path, port
    let s = h.replace(/^https?:\/\//i, '')
    s = s.split('/')[0]
    s = s.split(':')[0]
    return s.replace(/^www\./i, '').toLowerCase()
  }
}

/**
 * Generate a signed JWT for demo access with replay protection
 * @param orgId - Organization ID
 * @param host - Optional host for host pinning (may be a URL or hostname)
 */
export async function generateDemoToken(orgId: string, host?: string): Promise<string> {
  const key = getHmacKey(DEMO_TOKEN_SECRET)
  const jti = randomBytes(16).toString('hex')
  const now = Math.floor(Date.now() / 1000)
  const iat = now
  const exp = iat + DEMO_TOKEN_EXPIRY

  const payload: any = {
    orgId,
    role: 'demo',
    jti,
    iat,
    exp,
  }

  if (host) {
    payload.host = normalizeHost(host)
  }

  const header = { alg: 'HS256', typ: 'JWT' }
  const token = signHs256(header, payload, key)
  return token
}

type RedisAdapter = {
  isTokenUsed?: (jti: string) => Promise<boolean>
  storeTokenJti?: (jti: string, ttlSeconds: number) => Promise<void>
}

/**
 * Verify and decode a demo token with strict security checks.
 * Optionally accepts a Redis adapter for fast-path testing.
 */
export async function verifyDemoToken(
  token: string,
  expectedHost?: string,
  adapter?: RedisAdapter
): Promise<DemoTokenPayload> {
  const key = getHmacKey(DEMO_TOKEN_SECRET)

  try {
    const payload: any = verifyHs256(token, key)

    // Ensure payload fields exist and are numbers/strings
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

    // expired
    if (now >= payload.exp) {
      throw new Error('Token has expired')
    }

    // IAT skew (future)
    if (payload.iat > now + MAX_IAT_SKEW) {
      throw new Error('Token issued-at time is too far in the future')
    }

    // IAT not too old
    if (now - payload.iat > DEMO_TOKEN_EXPIRY) {
      throw new Error('Token issued-at time is too old')
    }

    // lifetime must not exceed max expiry (check after IAT checks so tests fail on IAT first)
    const lifetime = payload.exp - payload.iat
    if (lifetime > DEMO_TOKEN_EXPIRY) {
      throw new Error('Token expiration exceeds maximum allowed duration')
    }

    // replay protection
    const isUsed = adapter?.isTokenUsed ? await adapter.isTokenUsed(payload.jti) : await isTokenUsed(payload.jti)
    if (isUsed) {
      throw new Error('Token has already been used (replay attack detected)')
    }

    // host pinning: only if token includes host
    if (payload.host && typeof payload.host === 'string' && expectedHost) {
      const normalizedExpected = normalizeHost(expectedHost)
      const normalizedTokenHost = normalizeHost(payload.host)
      if (normalizedExpected !== normalizedTokenHost) {
        throw new Error('Token host mismatch')
      }
    }

    // store JTI to prevent replay; TTL = remaining seconds
    const remaining = payload.exp - now
    await (adapter?.storeTokenJti ? adapter.storeTokenJti(payload.jti, remaining) : storeTokenJti(payload.jti, remaining))

    return {
      orgId: payload.orgId,
      role: payload.role,
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
      host: payload.host as string | undefined,
    }
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Invalid demo token: ${err.message}`)
    }
    throw new Error('Invalid demo token')
  }
}

export function isDemoTokenExpired(token: DemoTokenPayload): boolean {
  return Math.floor(Date.now() / 1000) >= token.exp
}

function base64UrlEncode(buf: Buffer | Uint8Array | string): string {
  let b: Buffer
  if (typeof buf === 'string') b = Buffer.from(buf, 'utf8')
  else b = Buffer.from(buf)
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function base64UrlDecode(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64')
}

export function signHs256(header: object, payload: object, key: Uint8Array | Buffer | string) {
  const headerStr = JSON.stringify(header)
  const payloadStr = JSON.stringify(payload)
  const signingInput = `${base64UrlEncode(headerStr)}.${base64UrlEncode(payloadStr)}`
  const hmac = createHmac('sha256', Buffer.from(key as any))
  hmac.update(signingInput)
  const sig = hmac.digest()
  return `${signingInput}.${base64UrlEncode(sig)}`
}

function verifyHs256(token: string, key: Uint8Array | Buffer | string) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')
  const [encodedHeader, encodedPayload, encodedSig] = parts
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = base64UrlDecode(encodedSig)

  const hmac = createHmac('sha256', Buffer.from(key as any))
  hmac.update(signingInput)
  const expected = hmac.digest()

  if (expected.length !== signature.length || !timingSafeEqual(expected, signature)) {
    throw new Error('Invalid signature')
  }

  const payloadBuf = base64UrlDecode(encodedPayload)
  const payloadJson = payloadBuf.toString('utf8')
  let payload: any
  try {
    payload = JSON.parse(payloadJson)
  } catch (e) {
    throw new Error('Invalid token payload')
  }

  return payload
}