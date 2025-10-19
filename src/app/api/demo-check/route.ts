import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check if demo user exists
    const demoUser = await prisma.user.findFirst({
      where: { email: 'demo@demo.example' },
    })

    // Check if demo organization exists
    const demoOrg = await prisma.organization.findFirst({
      where: { name: 'Quarry Demo' },
    })

    // Check if membership exists
    let membership = null
    if (demoUser && demoOrg) {
      membership = await prisma.orgMember.findFirst({
        where: {
          userId: demoUser.id,
          organizationId: demoOrg.id,
          role: 'DEMO',
        },
      })
    }

    return NextResponse.json({
      demoUser: !!demoUser,
      demoOrg: !!demoOrg,
      membership: !!membership,
      userId: demoUser?.id,
      orgId: demoOrg?.id,
    })
  } catch (error) {
    console.error('Demo check error:', error)
    return NextResponse.json(
      { error: 'Failed to check demo data' },
      { status: 500 }
    )
  }
}
