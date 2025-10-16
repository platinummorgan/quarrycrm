import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkDemoRateLimit } from '@/lib/rate-limit'
import { demoGuard } from '@/lib/demo-guard'

// GET /api/workspace - Get current workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Apply rate limiting for demo users
    if (session.user.isDemo || session.user.currentOrg?.role === 'DEMO') {
      const rateLimitResponse = checkDemoRateLimit(request, false)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }

    // Get user's organization
    const member = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            domain: true,
            description: true,
            logo: true,
            emailLogAddress: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!member?.organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(member.organization)
  } catch (error) {
    console.error('Workspace GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/workspace - Update workspace
export async function PUT(request: NextRequest) {
  // Block demo users from workspace updates
  const demoCheck = await demoGuard()
  if (demoCheck) return demoCheck

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Apply rate limiting for demo users
    if (session.user.isDemo || session.user.currentOrg?.role === 'DEMO') {
      const rateLimitResponse = checkDemoRateLimit(request, true)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }

    // Get user's organization
    const member = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
    })

    if (!member?.organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, logo } = body

    // Validate input
    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (logo !== undefined && logo !== null && typeof logo !== 'string') {
      return NextResponse.json(
        { error: 'Logo must be a string or null' },
        { status: 400 }
      )
    }

    // Update organization
    const updatedOrg = await prisma.organization.update({
      where: { id: member.organization.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(logo !== undefined && { logo }),
      },
      select: {
        id: true,
        name: true,
        domain: true,
        description: true,
        logo: true,
        emailLogAddress: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updatedOrg)
  } catch (error) {
    console.error('Workspace PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}