import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'

  if (!isProduction) {
    // Disallow all crawlers in non-production environments
    const robotsTxt = `User-agent: *
Disallow: /`

    return new NextResponse(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }

  // Allow indexing in production
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/sitemap.xml`

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}