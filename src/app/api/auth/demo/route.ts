import { NextRequest, NextResponse } from 'next/server'
import { signIn } from 'next-auth/react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkRateLimit, getClientIp, DemoRateLimits } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Apply rate limiting to demo authentication
  const clientIp = getClientIp(request)
  const rateLimitResult = await checkRateLimit(clientIp, DemoRateLimits.AUTH)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { error: 'Demo token is required' },
      { status: 400 }
    )
  }

  try {
    // Check if user is already authenticated
    const session = await getServerSession(authOptions)

    if (session) {
      // If already authenticated, redirect to app
      return NextResponse.redirect(new URL('/app', request.url))
    }

    // For demo authentication, we need to handle it on the client side
    // Redirect to a demo signin page that will automatically sign in
    const demoSigninUrl = new URL('/auth/demo-signin', request.url)
    demoSigninUrl.searchParams.set('token', token)

    return NextResponse.redirect(demoSigninUrl)
  } catch (error) {
    console.error('Demo auth redirect error:', error)
    return NextResponse.redirect(new URL('/auth/signin?error=demo', request.url))
  }
}