import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { prisma } from '@/lib/prisma'
import { generateDemoToken } from '@/lib/demo-auth'

export async function GET(request: NextRequest) {
  try {
    // Find the Quarry Demo organization
    const demoOrg = await prisma.organization.findFirst({
      where: { name: 'Quarry Demo' },
    })

    if (!demoOrg) {
      return NextResponse.json(
        { error: 'Demo organization not found. Please run the demo seed script first.' },
        { status: 404 }
      )
    }

  // Get current host for host pinning
  const requestUrl = new URL(request.url)
  const host = requestUrl.host

  // Generate demo token with host pinning
  const token = await generateDemoToken(demoOrg.id, host)

  // Create redirect URL with canonical base origin
  const { getBaseUrl } = await import('@/lib/baseUrl')
  const baseUrl = getBaseUrl()
  const redirectUrl = new URL('/api/auth/demo', baseUrl)
    redirectUrl.searchParams.set('token', token)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Demo route error:', error)
    return NextResponse.json(
      { error: 'Failed to generate demo token' },
      { status: 500 }
    )
  }
}