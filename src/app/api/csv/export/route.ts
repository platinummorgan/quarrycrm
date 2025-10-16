import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EntityType } from '@/lib/csv-processor'
import Papa from 'papaparse'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { maskEmail, maskPhone } from '@/lib/mask-pii'
import { checkRateLimit, getClientIp, DemoRateLimits } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is demo
    const isDemo = session.user.isDemo || session.user.currentOrg?.role === 'DEMO'
    
    // Apply stricter rate limiting to demo users for exports
    if (isDemo) {
      const clientIp = getClientIp(request)
      const rateLimitResult = await checkRateLimit(clientIp, DemoRateLimits.EXPORT)

      if (!rateLimitResult.success) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many export requests. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.retryAfter?.toString() || '300',
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            },
          }
        )
      }
    }

    const orgId = session.user.currentOrg?.id

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      entityType,
      filters = {},
      selectedColumns = [],
      format = 'csv'
    }: {
      entityType: EntityType
      filters?: Record<string, any>
      selectedColumns?: string[]
      format?: 'csv' | 'json'
    } = body

    if (!entityType) {
      return NextResponse.json(
        { error: 'Entity type is required' },
        { status: 400 }
      )
    }

    let data: any[] = []
    let filename = `${entityType.toLowerCase()}_export`

    switch (entityType) {
      case EntityType.CONTACT:
        data = await prisma.contact.findMany({
          where: {
            organizationId: orgId,
            deletedAt: null,
            ...filters,
          },
          include: {
            company: { select: { name: true } },
            owner: { select: { user: { select: { name: true } } } },
          },
        })
        break

      case EntityType.COMPANY:
        data = await prisma.company.findMany({
          where: {
            organizationId: orgId,
            deletedAt: null,
            ...filters,
          },
          include: {
            owner: { select: { user: { select: { name: true } } } },
            _count: { select: { contacts: true } },
          },
        })
        break

      case EntityType.DEAL:
        data = await prisma.deal.findMany({
          where: {
            organizationId: orgId,
            deletedAt: null,
            ...filters,
          },
          include: {
            contact: { select: { firstName: true, lastName: true, email: true } },
            company: { select: { name: true } },
            stage: { select: { name: true } },
            pipeline: { select: { name: true } },
            owner: { select: { user: { select: { name: true } } } },
          },
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid entity type' },
          { status: 400 }
        )
    }

    // Transform data for export
    const transformedData = data.map(item => {
      const transformed: Record<string, any> = { ...item }

      // Flatten relations
      if (item.company) {
        transformed.companyName = item.company.name
        delete transformed.company
      }

      if (item.contact) {
        transformed.contactName = `${item.contact.firstName} ${item.contact.lastName}`.trim()
        transformed.contactEmail = item.contact.email
        delete transformed.contact
      }

      if (item.stage) {
        transformed.stageName = item.stage.name
        delete transformed.stage
      }

      if (item.pipeline) {
        transformed.pipelineName = item.pipeline.name
        delete transformed.pipeline
      }

      if (item.owner?.user) {
        transformed.ownerName = item.owner.user.name
        delete transformed.owner
      }

      // Mask PII for demo users
      if (isDemo) {
        if (transformed.email) {
          transformed.email = maskEmail(transformed.email)
        }
        if (transformed.phone) {
          transformed.phone = maskPhone(transformed.phone)
        }
        if (transformed.contactEmail) {
          transformed.contactEmail = maskEmail(transformed.contactEmail)
        }
      }

      // Remove internal fields
      delete transformed.id
      delete transformed.organizationId
      delete transformed.createdAt
      delete transformed.updatedAt
      delete transformed.deletedAt

      return transformed
    })

    if (format === 'json') {
      return NextResponse.json({
        data: transformedData,
        count: transformedData.length,
      })
    }

    // Generate CSV
    const csv = Papa.unparse(transformedData)

    // Return CSV file
    const response = new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })

    return response

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}