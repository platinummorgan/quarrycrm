import { NextResponse } from 'next/server'

export function middleware(req: Request) {
  const url = new URL(req.url)
  const host = url.host

  // Allow auth/webhooks to pass through without extra redirects
  const isAuthRoute = url.pathname.startsWith('/api/auth/')
  if (host === 'quarrycrm.vercel.app' && !isAuthRoute) {
    url.host = 'www.quarrycrm.com'
    return NextResponse.redirect(url, 308)
  }

  // Optional: preview banner & robots for non-prod
  const res = NextResponse.next()
  const isProd = process.env.NEXT_PUBLIC_APP_ENV === 'prod'
  if (!isProd) res.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return res
}

export const config = { matcher: ['/:path*'] }
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * Check if request is from demo subdomain
 */
function isDemoSubdomain(request: NextRequest): boolean {
  const host = request.headers.get('host') || ''
  return host.startsWith('demo.') || host === 'demo.localhost:3000'
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const isDemo = isDemoSubdomain(request)

  // Security Headers - Applied to all responses
  // HSTS: Force HTTPS for 1 year, include subdomains, allow preload
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Prevent clickjacking - deny embedding in frames
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Referrer policy - send origin only on cross-origin requests
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy - Restrict browser features (minimal set)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Set X-Robots-Tag: noindex, nofollow for demo or preview, but not prod
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV;
  if (isDemo || appEnv === 'preview') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (isDemo) console.log('🔍 Demo subdomain detected - noindex header set');
  } else {
    response.headers.delete('X-Robots-Tag');
  }

  // Demo subdomain write protection - block ALL write operations on demo subdomain
  const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  if (writeMethod) {
    // Check 1: Block writes on demo subdomain (regardless of auth)
    if (isDemo && request.nextUrl.pathname.startsWith('/api/')) {
      // Allow auth endpoints and admin demo-reset
      const allowedPaths = [
        '/api/auth/',
        '/api/admin/demo-reset',
      ]
      const isAllowed = allowedPaths.some(path => request.nextUrl.pathname.startsWith(path))
      
      if (!isAllowed) {
        console.log('🚫 DEMO SUBDOMAIN WRITE BLOCKED:', request.method, request.nextUrl.pathname)
        return NextResponse.json(
          { 
            error: 'Write operations are disabled on demo subdomain',
            message: 'The demo environment is read-only. Sign up for full access.',
            code: 'DEMO_SUBDOMAIN_READ_ONLY' 
          },
          { status: 403 }
        )
      }
    }

    // Check 2: Block writes for demo users (belt-and-suspenders)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      try {
        const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
        
        if (token?.isDemo || token?.currentOrg?.role === 'DEMO') {
          console.log('🚫 DEMO USER WRITE BLOCKED:', request.method, request.nextUrl.pathname)
          return NextResponse.json(
            { 
              error: 'Demo users have read-only access',
              message: 'Write operations are disabled in demo mode.',
              code: 'DEMO_USER_READ_ONLY' 
            },
            { status: 403 }
          )
        }
      } catch (error) {
        console.error('Middleware auth check error:', error)
        // Continue - let API routes handle auth
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}