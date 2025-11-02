import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if demo org exists
    const demoOrg = await prisma.organization.findFirst({
      where: { name: 'Quarry Demo' },
    })

    // Check if demo user exists
    const demoUser = await prisma.user.findFirst({
      where: { email: 'demo@demo.example' },
    })

    // Check if membership exists
    let membership = null
    if (demoOrg && demoUser) {
      membership = await prisma.orgMember.findFirst({
        where: {
          organizationId: demoOrg.id,
          userId: demoUser.id,
        },
      })
    }

    // Check environment variables
    const envCheck = {
      hasDemoTokenSecret: !!process.env.DEMO_TOKEN_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV,
    }

    return NextResponse.json({
      status: 'ok',
      database: {
        demoOrg: demoOrg
          ? { id: demoOrg.id, name: demoOrg.name }
          : 'NOT FOUND',
        demoUser: demoUser
          ? { id: demoUser.id, email: demoUser.email }
          : 'NOT FOUND',
        membership: membership
          ? { id: membership.id, role: membership.role }
          : 'NOT FOUND',
      },
      environment: envCheck,
      requestHost: request.headers.get('host'),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Debug check failed',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
