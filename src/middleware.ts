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

// Neutral module to avoid duplicate middleware definitions during build.
// The real middleware lives at the repository root `middleware.ts`.

// Neutral module to avoid duplicate middleware definitions during build.
// The real middleware lives at the repository root `middleware.ts`.

// Keep this file intentionally empty (no middleware exports).
export {}
