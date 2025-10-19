import {
  createTRPCRouter,
  orgProcedure,
  demoProcedure,
  rateLimitedProcedure,
} from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { WriteRateLimits } from '@/lib/rate-limit'

// Input/Output schemas
const dealFiltersSchema = z.object({
  q: z.string().optional(), // Search query
  owner: z.string().optional(), // Filter by owner ID
  stage: z.string().optional(), // Filter by stage ID
  pipeline: z.string().optional(), // Filter by pipeline ID
  contact: z.string().optional(), // Filter by contact ID
  company: z.string().optional(), // Filter by company ID
  updatedSince: z.date().optional(), // Filter by updated date
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(), // For keyset pagination
})

const dealCreateSchema = z.object({
  title: z.string().min(1).max(200),
  value: z.number().positive().optional(),
  probability: z.number().min(0).max(100).default(0),
  stageId: z.string().optional(),
  pipelineId: z.string(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  expectedClose: z.date().optional(),
})

const dealUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  value: z.number().positive().optional(),
  probability: z.number().min(0).max(100).optional(),
  stageId: z.string().optional(),
  pipelineId: z.string().optional(),
  contactId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  expectedClose: z.date().optional(),
})

const dealListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      value: z.number().nullable(),
      probability: z.number().nullable(),
      expectedClose: z.date().nullable(),
      stage: z
        .object({
          id: z.string(),
          name: z.string(),
          color: z.string().nullable(),
        })
        .nullable(),
      pipeline: z.object({
        id: z.string(),
        name: z.string(),
      }),
      contact: z
        .object({
          id: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().nullable(),
        })
        .nullable(),
      company: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .nullable(),
      owner: z.object({
        id: z.string(),
        user: z.object({
          id: z.string(),
          name: z.string().nullable(),
          email: z.string(),
        }),
      }),
      updatedAt: z.date(),
      createdAt: z.date(),
    })
  ),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number(),
})

export const dealsRouter = createTRPCRouter({
  // List deals with pagination and filters
  list: orgProcedure
    .input(dealFiltersSchema)
    .output(dealListResponseSchema)
    .query(async ({ ctx, input }) => {
      const {
        q,
        owner,
        stage,
        pipeline,
        contact,
        company,
        updatedSince,
        limit,
        cursor,
      } = input

      // Build where clause
      const where: any = {
        organizationId: ctx.orgId,
        deletedAt: null,
      }

      // Add search filter using pg_trgm
      if (q && q.trim()) {
        where.title = {
          search: q.trim(),
        }
      }

      // Add filters
      if (owner) {
        where.ownerId = owner
      }
      if (stage) {
        where.stageId = stage
      }
      if (pipeline) {
        where.pipelineId = pipeline
      }
      if (contact) {
        where.contactId = contact
      }
      if (company) {
        where.companyId = company
      }

      // Add updated since filter
      if (updatedSince) {
        where.updatedAt = {
          gte: updatedSince,
        }
      }

      // Keyset pagination using updatedAt as cursor
      if (cursor) {
        const cursorDate = new Date(cursor)
        where.updatedAt = {
          ...where.updatedAt,
          lt: cursorDate,
        }
      }

      // Get total count for pagination info
      const total = await prisma.deal.count({ where })

      // Get deals with optimized select
      const items = await prisma.deal.findMany({
        where,
        select: {
          id: true,
          title: true,
          value: true,
          probability: true,
          expectedClose: true,
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
          updatedAt: true,
          createdAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit + 1, // Take one extra to check if there are more
      })

      const hasMore = items.length > limit
      const actualItems = hasMore ? items.slice(0, limit) : items
      const nextCursor = hasMore
        ? items[limit - 1].updatedAt.toISOString()
        : null

      return {
        items: actualItems,
        nextCursor,
        hasMore,
        total,
      }
    }),

  // Get deal by ID
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const deal = await prisma.deal.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          value: true,
          probability: true,
          expectedClose: true,
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
              phone: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              website: true,
              domain: true,
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
            select: {
              id: true,
              type: true,
              description: true,
              createdAt: true,
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
            orderBy: {
              createdAt: 'desc',
            },
            take: 20,
          },
          updatedAt: true,
          createdAt: true,
        },
      })

      if (!deal) {
        throw new Error('Deal not found')
      }

      return deal
    }),

  // Create deal
  create: rateLimitedProcedure(WriteRateLimits.DEALS)
    .use(demoProcedure._def.middlewares[0]) // Apply demo check
    .input(dealCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return await prisma.deal.create({
        data: {
          ...input,
          organizationId: ctx.orgId,
          ownerId: ctx.userId,
        },
        select: {
          id: true,
          title: true,
          value: true,
          probability: true,
          expectedClose: true,
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
          updatedAt: true,
          createdAt: true,
        },
      })
    }),

  // Update deal (partial)
  update: rateLimitedProcedure(WriteRateLimits.DEALS)
    .use(demoProcedure._def.middlewares[0]) // Apply demo check
    .input(
      z.object({
        id: z.string(),
        data: dealUpdateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input

      return await prisma.deal.updateMany({
        where: {
          id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        data,
      })
    }),

  // Soft delete deal
  delete: rateLimitedProcedure(WriteRateLimits.DEALS)
    .use(demoProcedure._def.middlewares[0]) // Apply demo check
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.deal.updateMany({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      })
    }),

  // Restore deal
  restore: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.deal.updateMany({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          deletedAt: {
            not: null,
          },
        },
        data: {
          deletedAt: null,
        },
      })
    }),

  // Move deal to a different stage (optimized for board operations)
  moveToStage: demoProcedure
    .input(
      z.object({
        dealId: z.string(),
        stageId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { dealId, stageId } = input

      // Verify deal belongs to organization
      const deal = await prisma.deal.findFirst({
        where: {
          id: dealId,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          pipelineId: true,
        },
      })

      if (!deal) {
        throw new Error('Deal not found')
      }

      // Verify stage belongs to same pipeline
      const stage = await prisma.stage.findFirst({
        where: {
          id: stageId,
          pipelineId: deal.pipelineId,
        },
      })

      if (!stage) {
        throw new Error(
          'Stage not found or does not belong to the same pipeline'
        )
      }

      // Update deal's stage
      return await prisma.deal.update({
        where: { id: dealId },
        data: { stageId },
        select: {
          id: true,
          title: true,
          value: true,
          probability: true,
          expectedClose: true,
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
          updatedAt: true,
          createdAt: true,
        },
      })
    }),

  // Get deals at risk (closing soon with low probability or no recent activity)
  atRisk: orgProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId } = ctx

      // Get deals that meet at-risk criteria:
      // 1. Expected close date within 30 days
      // 2. Low probability (<= 50%)
      // 3. Not in won/lost stages
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      return await prisma.deal.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          OR: [
            // Deals closing soon with low probability
            {
              AND: [
                {
                  expectedClose: {
                    lte: thirtyDaysFromNow,
                    gte: new Date(),
                  },
                },
                {
                  probability: {
                    lte: 50,
                  },
                },
              ],
            },
            // Deals with no recent activity
            {
              updatedAt: {
                lte: sevenDaysAgo,
              },
            },
          ],
        },
        include: {
          stage: {
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
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          {
            expectedClose: 'asc',
          },
          {
            probability: 'asc',
          },
        ],
        take: input.limit,
      })
    }),
})
