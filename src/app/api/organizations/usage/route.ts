import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await requireOrg()

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