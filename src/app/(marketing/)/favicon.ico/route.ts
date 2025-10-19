import { NextResponse } from 'next/server'

// Simple favicon.ico handler to avoid soft 404s
// This serves a minimal favicon or redirects to a default one
export async function GET() {
  // For now, return a 204 No Content to avoid 404s
  // In production, you might want to serve an actual favicon
  return new NextResponse(null, {
    status: 204, // No Content
    headers: {
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    },
  })
}
