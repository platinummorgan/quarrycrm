import { NextRequest, NextResponse } from 'next/server'
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

    // Generate demo token
    const token = await generateDemoToken(demoOrg.id)

    // Create redirect URL with token
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
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