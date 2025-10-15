import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
    const isDemoRoute = req.nextUrl.pathname === '/demo'

    // Check if this is a demo subdomain
    const hostname = req.headers.get('host') || ''
    const isDemoSubdomain = hostname.startsWith('demo.')

    // Block POST requests on demo subdomain (belt-and-suspenders)
    if (isDemoSubdomain && req.method === 'POST') {
      return new NextResponse(
        JSON.stringify({
          error: 'POST requests are not allowed on demo environment',
          code: 'DEMO_READONLY'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Add X-Robots-Tag header for non-production environments
    const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'
    if (!isProduction) {
      req.headers.set('X-Robots-Tag', 'noindex, nofollow')
    }

    // Force demo auto-login flow for demo subdomain
    if (isDemoSubdomain && !isAuth && !isAuthPage && !isApiAuthRoute && !isDemoRoute) {
      // Redirect to /demo for auto-login
      return NextResponse.redirect(new URL('/demo', req.url))
    }

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL('/app', req.url))
    }

    // Allow access to auth routes and demo route
    if (isApiAuthRoute || isAuthPage || isDemoRoute) {
      return NextResponse.next()
    }

    // Protect /app routes
    if (req.nextUrl.pathname.startsWith('/app')) {
      if (!isAuth) {
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
