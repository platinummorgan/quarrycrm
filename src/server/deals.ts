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
      const { orgId } = await requireOrg()
      const {
        pipeline,
        q,
        limit = 25,
        cursor,
      } = dealsFiltersSchema.parse(filters)

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
  const { orgId } = await requireOrg()

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
