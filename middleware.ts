import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Canonical host redirect: quarrycrm.vercel.app -> www.quarrycrm.com
    // Allow auth routes to pass through without redirect.
    try {
      const url = new URL(req.url)
      const host = url.host
      const isAuthRoute = url.pathname.startsWith('/api/auth/')
      
      // Don't redirect auth callbacks - let NextAuth handle them completely
      if (url.pathname.startsWith('/api/auth/callback')) {
        return NextResponse.next()
      }
      
      if (host === 'quarrycrm.vercel.app' && !isAuthRoute) {
        url.host = 'www.quarrycrm.com'
        return NextResponse.redirect(url, 308)
      }
    } catch (err) {
      // ignore URL parse errors and continue with auth middleware
    }

    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
    const isDemoRoute = req.nextUrl.pathname === '/demo'

    // Check if this is a non-production environment
    const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'

    // Check if this is a demo subdomain
    const hostname = req.headers.get('host') || ''
    const isDemoSubdomain = hostname.startsWith('demo.')

    // Block POST requests on demo subdomain (belt-and-suspenders)
    if (isDemoSubdomain && req.method === 'POST') {
      const response = new NextResponse(
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
      
      // Add X-Robots-Tag for non-production
      if (!isProduction) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      }
      
      return response
    }

    // Force demo auto-login flow for demo subdomain
    if (isDemoSubdomain && !isAuth && !isAuthPage && !isApiAuthRoute && !isDemoRoute) {
      // Redirect to /demo for auto-login
      const response = NextResponse.redirect(new URL('/demo', req.url))
      
      // Add X-Robots-Tag for non-production
      if (!isProduction) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      }
      
      return response
    }

    // Redirect authenticated users away from auth pages
    // UNLESS there's an error parameter (e.g., from failed email verification)
    if (isAuthPage && isAuth) {
      const hasError = req.nextUrl.searchParams.has('error')
      if (!hasError) {
        const response = NextResponse.redirect(new URL('/app', req.url))
        
        // Add X-Robots-Tag for non-production
        if (!isProduction) {
          response.headers.set('X-Robots-Tag', 'noindex, nofollow')
        }
        
        return response
      }
    }

    // Allow access to auth routes and demo route
    if (isApiAuthRoute || isAuthPage || isDemoRoute) {
      const response = NextResponse.next()
      
      // Add X-Robots-Tag for non-production
      if (!isProduction) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      }
      
      return response
    }

    // Protect /app routes
    if (req.nextUrl.pathname.startsWith('/app')) {
      if (!isAuth) {
        const response = NextResponse.redirect(new URL('/auth/signin', req.url))
        
        // Add X-Robots-Tag for non-production
        if (!isProduction) {
          response.headers.set('X-Robots-Tag', 'noindex, nofollow')
        }
        
        return response
      }
    }

    // Default response with X-Robots-Tag for non-production
    const response = NextResponse.next()
    
    if (!isProduction) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    }
    
    return response
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Always allow NextAuth callback routes
        if (req.nextUrl.pathname.startsWith('/api/auth/')) {
          return true
        }
        // Always allow auth pages
        if (req.nextUrl.pathname.startsWith('/auth')) {
          return true
        }
        // For app routes, require token
        if (req.nextUrl.pathname.startsWith('/app')) {
          return !!token
        }
        // Allow everything else
        return true
      },
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
