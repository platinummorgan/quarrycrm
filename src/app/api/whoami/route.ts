import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, getClientIp, DemoRateLimits } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/whoami
 * 
 * Returns current user authentication status and basic info.
 * Useful for debugging and client-side session checks.
 * 
 * Response:
 * {
 *   authenticated: boolean,
 *   user: { id: string, email: string } | null,
 *   orgId: string | null,
 *   orgName: string | null,
 *   role: string | null,
 *   isDemo: boolean
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isDemo = session?.user?.isDemo || session?.user?.currentOrg?.role === 'DEMO'

    // Apply rate limiting to demo sessions
    if (isDemo) {
      const clientIp = getClientIp(request)
      const rateLimitResult = await checkRateLimit(clientIp, DemoRateLimits.API)

      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.reset.toString(),
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          }
        )
      }
    }

    if (!session?.user) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          orgId: null,
          orgName: null,
          role: null,
          isDemo: false,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
        },
        orgId: session.user.currentOrg?.id || null,
        orgName: session.user.currentOrg?.name || null,
        role: session.user.currentOrg?.role || null,
        isDemo: session.user.isDemo || false,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Failed to fetch whoami:', error)
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        orgId: null,
        orgName: null,
        role: null,
        isDemo: false,
        error: 'Failed to fetch session',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  }
}
