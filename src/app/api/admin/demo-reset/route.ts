import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/demo-reset
 * 
 * Truncates and reseeds the demo organization data.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be OWNER of the Quarry Demo organization
 * - Only works in non-production environments
 * - Idempotent operation
 * 
 * Process:
 * 1. Verify user is OWNER of Quarry Demo org
 * 2. Delete all demo data (deals, activities, contacts, companies)
 * 3. Run seed-demo script to regenerate data
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   stats: { companies, contacts, deals, activities }
 * }
 */
export async function POST() {
  try {
    // Check environment - only allow in non-production
    const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'
    if (isProduction) {
      return NextResponse.json(
        {
          success: false,
          error: 'Demo reset is not available in production',
        },
        { status: 403 }
      )
    }

    // Get current session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Find Quarry Demo organization
    const demoOrg = await prisma.organization.findFirst({
      where: { name: 'Quarry Demo' },
      select: {
        id: true,
        name: true,
      },
    })

    if (!demoOrg) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quarry Demo organization not found. Run seed:demo first.',
        },
        { status: 404 }
      )
    }

    // Check if user is a member of demo org
    const membership = await prisma.orgMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: demoOrg.id,
          userId: session.user.id,
        },
      },
      select: {
        role: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          error: 'You are not a member of the Quarry Demo organization',
        },
        { status: 403 }
      )
    }

    // Verify user is OWNER
    if (membership.role !== 'OWNER') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only organization owners can reset demo data',
          currentRole: membership.role,
        },
        { status: 403 }
      )
    }

    // Get counts before deletion
    const beforeStats = await getOrgStats(demoOrg.id)

    console.log('🔄 Starting demo reset...')
    console.log(`   Organization: ${demoOrg.name} (${demoOrg.id})`)
    console.log(`   Requested by: ${session.user.email}`)
    console.log(`   Before: ${JSON.stringify(beforeStats)}`)

    // Step 1: Delete all demo data in correct order (respect FK constraints)
    console.log('🧹 Cleaning existing data...')

    await prisma.activity.deleteMany({
      where: { organizationId: demoOrg.id },
    })
    console.log('   ✓ Deleted activities')

    await prisma.deal.deleteMany({
      where: { organizationId: demoOrg.id },
    })
    console.log('   ✓ Deleted deals')

    await prisma.contact.deleteMany({
      where: { organizationId: demoOrg.id },
    })
    console.log('   ✓ Deleted contacts')

    await prisma.company.deleteMany({
      where: { organizationId: demoOrg.id },
    })
    console.log('   ✓ Deleted companies')

    // Step 2: Run seed script
    console.log('🌱 Running seed script...')
    try {
      // Run the seed script (without --clean flag since we already cleaned)
      const { stdout, stderr } = await execAsync('npm run seed:demo', {
        cwd: process.cwd(),
        timeout: 120000, // 2 minute timeout
      })

      if (stderr && !stderr.includes('warn')) {
        console.error('Seed script stderr:', stderr)
      }

      console.log('Seed script output:', stdout)
    } catch (error) {
      console.error('Failed to run seed script:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to run seed script',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    // Step 3: Get counts after seeding
    const afterStats = await getOrgStats(demoOrg.id)

    console.log('✅ Demo reset complete!')
    console.log(`   After: ${JSON.stringify(afterStats)}`)

    return NextResponse.json(
      {
        success: true,
        message: 'Demo data successfully reset',
        organization: demoOrg.name,
        stats: {
          before: beforeStats,
          after: afterStats,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Demo reset failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset demo data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Get organization data counts
 */
async function getOrgStats(orgId: string) {
  const [companies, contacts, deals, activities] = await Promise.all([
    prisma.company.count({ where: { organizationId: orgId } }),
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.deal.count({ where: { organizationId: orgId } }),
    prisma.activity.count({ where: { organizationId: orgId } }),
  ])

  return {
    companies,
    contacts,
    deals,
    activities,
  }
}
