import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, getClientIp, DemoRateLimits } from '@/lib/rate-limit'
import { withServerTiming } from '@/lib/server-timing'

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
export const GET = withServerTiming(async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    let role = null;
    let org = null;
    if (session?.user?.currentOrg) {
      role = session.user.currentOrg.role || null;
      org = session.user.currentOrg.id || null;
    }
    return NextResponse.json({
      authenticated: !!session?.user,
      role,
      org,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      role: null,
      org: null,
      error: 'Failed to fetch session',
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
});
