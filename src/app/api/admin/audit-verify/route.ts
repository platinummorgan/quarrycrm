/**
 * Admin Audit Chain Verification Route
 * 
 * Development-only endpoint to verify audit trail integrity
 * 
 * GET /admin/audit-verify
 * 
 * Query params:
 * - organizationId (optional): Verify specific organization
 * - all (optional): Verify all organizations
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOrganizationAuditChain, verifyAllAuditChains } from '@/lib/audit/chain'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const verifyAll = searchParams.get('all') === 'true'

    // Verify all organizations
    if (verifyAll) {
      const resultsMap = await verifyAllAuditChains(prisma)
      
      const results = Array.from(resultsMap.entries()).map(([orgId, result]) => ({
        organizationId: orgId,
        ...result,
      }))

      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0)
      const allValid = results.every(r => r.valid)

      return NextResponse.json({
        summary: {
          totalOrganizations: results.length,
          totalRecords: results.reduce((sum, r) => sum + r.totalRecords, 0),
          allValid,
          totalErrors,
        },
        organizations: results,
      })
    }

    // Verify specific organization
    if (organizationId) {
      const result = await verifyOrganizationAuditChain(prisma, organizationId)

      return NextResponse.json({
        organizationId,
        ...result,
      })
    }

    // No parameters - show usage
    return NextResponse.json({
      usage: {
        description: 'Verify audit chain integrity',
        endpoints: [
          'GET /admin/audit-verify?organizationId=<id> - Verify specific organization',
          'GET /admin/audit-verify?all=true - Verify all organizations',
        ],
        examples: [
          '/admin/audit-verify?organizationId=cm123',
          '/admin/audit-verify?all=true',
        ],
      },
    })
  } catch (error) {
    console.error('Audit verification error:', error)
    return NextResponse.json(
      {
        error: 'Failed to verify audit chain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
