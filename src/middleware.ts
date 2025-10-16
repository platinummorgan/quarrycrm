import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Set noindex for preview environments
  if (process.env.NEXT_PUBLIC_APP_ENV === 'preview') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  // Demo user write protection - block write operations for demo users
  const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  if (writeMethod && request.nextUrl.pathname.startsWith('/api/')) {
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
      
      if (token?.isDemo) {
        console.log('🚫 DEMO WRITE BLOCKED:', request.method, request.nextUrl.pathname)
        return NextResponse.json(
          { 
            error: 'Demo users have read-only access',
            code: 'DEMO_READ_ONLY' 
          },
          { status: 403 }
        )
      }
    } catch (error) {
      console.error('Middleware auth check error:', error)
      // Continue - let API routes handle auth
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