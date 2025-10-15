import { NextRequest, NextResponse } from 'next/server'
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

    // Get usage counts in parallel
    const [contacts, pipelines, companies, deals, users] = await Promise.all([
      prisma.contact.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.pipeline.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.company.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.deal.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.orgMember.count({
        where: { organizationId: orgId },
      }),
    ])

    return NextResponse.json({
      contacts,
      pipelines,
      companies,
      deals,
      users,
    })
  } catch (error) {
    console.error('Failed to fetch usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}