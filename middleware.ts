import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')

    // Add X-Robots-Tag header for non-production environments
    const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'
    if (!isProduction) {
      req.headers.set('X-Robots-Tag', 'noindex, nofollow')
    }

    // Redirect authenticated users away from auth pages
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL('/app', req.url))
    }

    // Allow access to auth routes
    if (isApiAuthRoute || isAuthPage) {
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
