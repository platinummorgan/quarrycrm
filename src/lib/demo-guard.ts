import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Server-side guard to prevent demo users from performing write operations
 * Returns a 403 response if the user is a demo user
 */
export async function demoGuard() {
  const session = await getServerSession(authOptions)

  // If there's no session, treat as unauthenticated
  if (!session) {
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'UNAUTHENTICATED',
      },
      { status: 401 }
    )
  }

  if (session?.user?.isDemo) {
    return NextResponse.json(
      {
        error: 'Demo users have read-only access',
        code: 'DEMO_READ_ONLY',
        // Human-friendly message used by some callers/tests
        message: 'Demo users cannot perform write operations',
      },
      { status: 403 }
    )
  }

  return null // Allow the request to proceed
}

/**
 * Check if current user is a demo user (for use in API routes)
 */
export async function isDemoUser() {
  const session = await getServerSession(authOptions)
  return session?.user?.isDemo === true
}
