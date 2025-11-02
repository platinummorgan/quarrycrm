'use server'

import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/auth-helpers'
import {
  dealsFiltersSchema,
  moveDealSchema,
  type DealsListResponse,
  type PipelinesListResponse,
} from '@/lib/zod/deals'
import { revalidatePath } from 'next/cache'
import { PerformanceUtils } from '@/lib/metrics'

// Server action to get deals list
export async function getDeals(
  filters: {
    pipeline?: string
    q?: string
    limit?: number
    cursor?: string
  } = {}
): Promise<DealsListResponse> {
  return PerformanceUtils.measureServerOperation(
    'deals-list',
    async () => {
      // Try to get authenticated user, but don't fail if not authenticated
      let orgId: string | null = null
      try {
        const authResult = await requireOrg()
        orgId = authResult.orgId
      } catch (error) {
        // User is not authenticated, will provide demo data below
        orgId = null
      }

      const {
        pipeline,
        q,
        limit = 25,
        cursor,
      } = dealsFiltersSchema.parse(filters)

      // If not authenticated, return demo data
      if (!orgId) {
        return getDemoDeals(filters)
      }

      // Build where clause
      const where: any = {
        organizationId: orgId,
        deletedAt: null,
      }

      // Add pipeline filter
      if (pipeline) {
        where.pipelineId = pipeline
      }

      // Add search filter using pg_trgm
      if (q && q.trim()) {
        where.OR = [
          { title: { search: q } },
          { contact: { firstName: { search: q } } },
          { contact: { lastName: { search: q } } },
          { contact: { email: { search: q } } },
          { company: { name: { search: q } } },
        ]
      }

      // Build cursor condition for keyset pagination
      if (cursor) {
        const [updatedAtStr, id] = cursor.split('_')
        const updatedAt = new Date(updatedAtStr)

        where.OR = where.OR || []
        where.OR.push(
          {
            updatedAt: { lt: updatedAt },
          },
          {
            updatedAt,
            id: { lt: id },
          }
        )
      }

      // Get total count
      const total = await prisma.deal.count({ where })

      // Get deals with optimized select
      const deals = await prisma.deal.findMany({
        where,
        select: {
          id: true,
          title: true,
          value: true,
          probability: true,
          expectedClose: true,
          updatedAt: true,
          createdAt: true,
          stage: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          pipeline: {
            select: {
              id: true,
              name: true,
            },
          },
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          owner: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          activities: {
            where: {
              type: {
                in: ['CALL', 'MESSAGE', 'EMAIL'],
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              createdAt: true,
              type: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1, // Get one extra to check if there are more
      })

      // Check if there are more results
      const hasMore = deals.length > limit
      const items = hasMore ? deals.slice(0, -1) : deals

      // Generate next cursor
      const nextCursor =
        hasMore && items.length > 0
          ? `${items[items.length - 1].updatedAt.toISOString()}_${items[items.length - 1].id}`
          : null

      return {
        items,
        nextCursor,
        hasMore,
        total,
      }
    },
    { query: filters.q, pipeline: filters.pipeline, limit: filters.limit }
  ).then(({ result }) => result)
}

// Server action to get pipelines list
export async function getPipelines(): Promise<PipelinesListResponse> {
  // Try to get authenticated user, but don't fail if not authenticated
  let orgId: string | null = null
  try {
    const authResult = await requireOrg()
    orgId = authResult.orgId
  } catch (error) {
    // User is not authenticated, will provide demo data below
    orgId = null
  }

  // If not authenticated, return demo pipelines
  if (!orgId) {
    return getDemoPipelines()
  }

  const pipelines = await prisma.pipeline.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      isDefault: true,
      stages: {
        select: {
          id: true,
          name: true,
          order: true,
          color: true,
          _count: {
            select: {
              deals: true,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return pipelines
}

// Server action to move deal to different stage
export async function moveDealToStage(data: {
  dealId: string
  stageId: string
}) {
  const { orgId } = await requireOrg()
  const { dealId, stageId } = moveDealSchema.parse(data)

  // Verify the deal belongs to the organization and get current stage
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      organizationId: orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      stageId: true,
      pipelineId: true,
    },
  })

  if (!deal) {
    throw new Error('Deal not found')
  }

  // Verify the stage belongs to the same pipeline
  const stage = await prisma.stage.findFirst({
    where: {
      id: stageId,
      pipelineId: deal.pipelineId,
    },
    select: {
      id: true,
      pipelineId: true,
    },
  })

  if (!stage) {
    throw new Error("Stage not found or does not belong to the deal's pipeline")
  }

  // Update the deal's stage
  const updatedDeal = await prisma.deal.update({
    where: {
      id: dealId,
    },
    data: {
      stageId: stageId,
    },
    select: {
      id: true,
      stage: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  })

  revalidatePath('/app/deals')

  return updatedDeal
}

// Demo data for unauthenticated users
function getDemoDeals(filters: {
  pipeline?: string
  q?: string
  limit?: number
  cursor?: string
}): DealsListResponse {
  const { pipeline, q, limit = 25 } = filters

  // Demo deals data
  const demoDeals = [
    {
      id: 'demo-deal-1',
      title: 'Enterprise Software License',
      value: 50000,
      probability: 75,
      expectedClose: new Date('2025-12-01'),
      updatedAt: new Date('2025-10-15'),
      createdAt: new Date('2025-09-01'),
      stage: {
        id: 'demo-stage-2',
        name: 'Qualified',
        color: '#10b981',
      },
      pipeline: {
        id: 'demo-pipeline-1',
        name: 'Sales Pipeline',
      },
      contact: {
        id: 'demo-contact-1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@techcorp.com',
      },
      company: {
        id: 'demo-company-1',
        name: 'TechCorp Inc.',
      },
      owner: {
        id: 'demo-user-1',
        user: {
          id: 'demo-user-1',
          name: 'Demo User',
          email: 'demo@quarrycrm.com',
        },
      },
    },
    {
      id: 'demo-deal-2',
      title: 'Consulting Services',
      value: 25000,
      probability: 60,
      expectedClose: new Date('2025-11-15'),
      updatedAt: new Date('2025-10-14'),
      createdAt: new Date('2025-08-15'),
      stage: {
        id: 'demo-stage-3',
        name: 'Proposal',
        color: '#f59e0b',
      },
      pipeline: {
        id: 'demo-pipeline-1',
        name: 'Sales Pipeline',
      },
      contact: {
        id: 'demo-contact-2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@consulting.com',
      },
      company: {
        id: 'demo-company-2',
        name: 'Johnson Consulting',
      },
      owner: {
        id: 'demo-user-1',
        user: {
          id: 'demo-user-1',
          name: 'Demo User',
          email: 'demo@quarrycrm.com',
        },
      },
    },
    {
      id: 'demo-deal-3',
      title: 'Mobile App Development',
      value: 35000,
      probability: 80,
      expectedClose: new Date('2025-10-30'),
      updatedAt: new Date('2025-10-13'),
      createdAt: new Date('2025-07-20'),
      stage: {
        id: 'demo-stage-4',
        name: 'Negotiation',
        color: '#8b5cf6',
      },
      pipeline: {
        id: 'demo-pipeline-1',
        name: 'Sales Pipeline',
      },
      contact: {
        id: 'demo-contact-3',
        firstName: 'Mike',
        lastName: 'Davis',
        email: 'mike.davis@startup.io',
      },
      company: {
        id: 'demo-company-3',
        name: 'StartupXYZ',
      },
      owner: {
        id: 'demo-user-1',
        user: {
          id: 'demo-user-1',
          name: 'Demo User',
          email: 'demo@quarrycrm.com',
        },
      },
    },
    {
      id: 'demo-deal-4',
      title: 'Cloud Migration Project',
      value: 75000,
      probability: 45,
      expectedClose: new Date('2026-01-15'),
      updatedAt: new Date('2025-10-12'),
      createdAt: new Date('2025-06-10'),
      stage: {
        id: 'demo-stage-1',
        name: 'Lead',
        color: '#3b82f6',
      },
      pipeline: {
        id: 'demo-pipeline-1',
        name: 'Sales Pipeline',
      },
      contact: {
        id: 'demo-contact-4',
        firstName: 'Lisa',
        lastName: 'Chen',
        email: 'lisa.chen@enterprise.com',
      },
      company: {
        id: 'demo-company-4',
        name: 'Enterprise Solutions Ltd.',
      },
      owner: {
        id: 'demo-user-1',
        user: {
          id: 'demo-user-1',
          name: 'Demo User',
          email: 'demo@quarrycrm.com',
        },
      },
    },
  ]

  // Filter by pipeline if specified
  let filteredDeals = demoDeals
  if (pipeline) {
    filteredDeals = demoDeals.filter(deal => deal.pipeline.id === pipeline)
  }

  // Filter by search query if specified
  if (q && q.trim()) {
    const searchTerm = q.toLowerCase()
    filteredDeals = filteredDeals.filter(deal =>
      deal.title.toLowerCase().includes(searchTerm) ||
      deal.contact?.firstName?.toLowerCase().includes(searchTerm) ||
      deal.contact?.lastName?.toLowerCase().includes(searchTerm) ||
      deal.contact?.email?.toLowerCase().includes(searchTerm) ||
      deal.company?.name?.toLowerCase().includes(searchTerm)
    )
  }

  // Apply limit
  const items = filteredDeals.slice(0, limit)
  const hasMore = filteredDeals.length > limit

  return {
    items,
    nextCursor: hasMore ? 'demo-cursor' : null,
    hasMore,
    total: filteredDeals.length,
  }
}

function getDemoPipelines(): PipelinesListResponse {
  return [
    {
      id: 'demo-pipeline-1',
      name: 'Sales Pipeline',
      description: 'Standard sales process pipeline',
      isDefault: true,
      stages: [
        {
          id: 'demo-stage-1',
          name: 'Lead',
          order: 0,
          color: '#3b82f6',
          _count: { deals: 1 },
        },
        {
          id: 'demo-stage-2',
          name: 'Qualified',
          order: 1,
          color: '#10b981',
          _count: { deals: 1 },
        },
        {
          id: 'demo-stage-3',
          name: 'Proposal',
          order: 2,
          color: '#f59e0b',
          _count: { deals: 1 },
        },
        {
          id: 'demo-stage-4',
          name: 'Negotiation',
          order: 3,
          color: '#8b5cf6',
          _count: { deals: 1 },
        },
        {
          id: 'demo-stage-5',
          name: 'Closed Won',
          order: 4,
          color: '#22c55e',
          _count: { deals: 0 },
        },
        {
          id: 'demo-stage-6',
          name: 'Closed Lost',
          order: 5,
          color: '#ef4444',
          _count: { deals: 0 },
        },
      ],
    },
  ]
}
