import { SignJWT, jwtVerify } from 'jose'

export interface DemoTokenPayload {
  orgId: string
  role: 'demo'
  iat: number
  exp: number
}

const DEMO_TOKEN_SECRET = process.env.DEMO_TOKEN_SECRET
const DEMO_TOKEN_EXPIRY = 15 * 60 // 15 minutes in seconds

if (!DEMO_TOKEN_SECRET) {
  throw new Error('DEMO_TOKEN_SECRET environment variable is required')
}

/**
 * Generate a signed JWT for demo access
 */
export async function generateDemoToken(orgId: string): Promise<string> {
  const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)

  const token = await new SignJWT({
    orgId,
    role: 'demo' as const,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() / 1000 + DEMO_TOKEN_EXPIRY)
    .sign(secret)

  return token
}

/**
 * Verify and decode a demo token
 */
export async function verifyDemoToken(token: string): Promise<DemoTokenPayload> {
  const secret = new TextEncoder().encode(DEMO_TOKEN_SECRET)

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })

    // Validate payload structure
    if (
      typeof payload.orgId !== 'string' ||
      payload.role !== 'demo' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new Error('Invalid token payload')
    }

    return {
      orgId: payload.orgId,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp,
    } as DemoTokenPayload
  } catch (error) {
    throw new Error('Invalid or expired demo token')
  }
}

/**
 * Check if a token is expired
 */
export function isDemoTokenExpired(token: DemoTokenPayload): boolean {
  return Date.now() / 1000 > token.exp
}