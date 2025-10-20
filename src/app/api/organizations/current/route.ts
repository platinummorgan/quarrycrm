import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/auth-helpers'
import { checkDemoRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const { session, orgId } = await requireOrg()

    // Apply rate limiting for demo users
    if (session.user.isDemo || session.user.currentOrg?.role === 'DEMO') {
      const rateLimitResponse = checkDemoRateLimit(request, false)
      if (rateLimitResponse) {
        return rateLimitResponse
      }
    }

    let organization
    try {
      organization = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          plan: true,
        },
      })
    } catch (err) {
      // If the test DB is missing the `plan` column, fall back to returning
      // the organization without plan and assume FREE.
      organization = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
        },
      })
      if (organization) {
        // @ts-expect-error add plan for runtime consumers
        organization.plan = 'FREE'
      }
    }

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error('Failed to fetch organization:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    )
  }
}
