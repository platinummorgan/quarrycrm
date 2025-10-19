import {
  createTRPCRouter,
  orgProcedure,
  demoProcedure,
} from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { checkPlanLimit } from '@/lib/plans'
import { getPipelines as getDemoPipelines } from '@/server/deals'

// Input/Output schemas
const pipelineCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
})

const pipelineUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
})

const stageCreateSchema = z.object({
  name: z.string().min(1).max(100),
  order: z.number().int().min(0),
  color: z.string().optional(),
  pipelineId: z.string(),
})

const stageUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
  color: z.string().optional(),
})

const pipelineListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      isDefault: z.boolean(),
      stages: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          order: z.number(),
          color: z.string().nullable(),
          _count: z.object({
            deals: z.number(),
          }),
        })
      ),
      _count: z.object({
        deals: z.number(),
      }),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
  ),
})

export const pipelinesRouter = createTRPCRouter({
  // List pipelines with stages
  // Use demoProcedure so public / unauthenticated visits can receive demo pipelines
  list: demoProcedure
    .output(pipelineListResponseSchema)
    .query(async ({ ctx }) => {
      // If an organization context exists, return real pipelines
      if (ctx?.orgId) {
        const items = await prisma.pipeline.findMany({
          where: {
            organizationId: ctx.orgId,
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
            _count: {
              select: {
                deals: true,
              },
            },
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        return { items }
      }

      // No org context — return demo pipelines shaped to match the output schema
      const pipelines = await getDemoPipelines()
      const now = new Date()
      const items = pipelines.map((p) => ({
        ...p,
        _count: { deals: p.stages.reduce((sum, s) => sum + (s._count?.deals || 0), 0) },
        createdAt: now,
        updatedAt: now,
        stages: p.stages.map((s) => ({
          ...s,
          _count: { deals: s._count?.deals || 0 },
        })),
      }))

      return { items }
    }),

  // Get pipeline by ID with stages
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const pipeline = await prisma.pipeline.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
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
          _count: {
            select: {
              deals: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      })

      if (!pipeline) {
        throw new Error('Pipeline not found')
      }

      return pipeline
    }),

  // Create pipeline
  create: demoProcedure
    .input(pipelineCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check plan limits
      const limitCheck = await checkPlanLimit(ctx.orgId, 'pipelines')
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.message || 'Plan limit reached')
      }

      return await prisma.pipeline.create({
        data: {
          ...input,
          organizationId: ctx.orgId,
          ownerId: ctx.userId,
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
            },
            orderBy: {
              order: 'asc',
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      })
    }),

  // Update pipeline
  update: demoProcedure
    .input(
      z.object({
        id: z.string(),
        data: pipelineUpdateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input

      return await prisma.pipeline.updateMany({
        where: {
          id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        data,
      })
    }),

  // Delete pipeline
  delete: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.pipeline.updateMany({
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

  // Create stage
  createStage: demoProcedure
    .input(stageCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify pipeline belongs to organization
      const pipeline = await prisma.pipeline.findFirst({
        where: {
          id: input.pipelineId,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
      })

      if (!pipeline) {
        throw new Error('Pipeline not found')
      }

      return await prisma.stage.create({
        data: input,
        select: {
          id: true,
          name: true,
          order: true,
          color: true,
          pipelineId: true,
        },
      })
    }),

  // Update stage
  updateStage: demoProcedure
    .input(
      z.object({
        id: z.string(),
        data: stageUpdateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input

      // Verify stage belongs to organization's pipeline
      const stage = await prisma.stage.findFirst({
        where: {
          id,
          pipeline: {
            organizationId: ctx.orgId,
            deletedAt: null,
          },
        },
      })

      if (!stage) {
        throw new Error('Stage not found')
      }

      return await prisma.stage.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          order: true,
          color: true,
          pipelineId: true,
        },
      })
    }),

  // Delete stage
  deleteStage: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify stage belongs to organization's pipeline
      const stage = await prisma.stage.findFirst({
        where: {
          id: input.id,
          pipeline: {
            organizationId: ctx.orgId,
            deletedAt: null,
          },
        },
      })

      if (!stage) {
        throw new Error('Stage not found')
      }

      return await prisma.stage.update({
        where: { id: input.id },
        data: {
          // Soft delete by moving deals to null stage
          pipeline: {
            update: {
              deals: {
                updateMany: {
                  where: {
                    stageId: input.id,
                  },
                  data: {
                    stageId: null,
                  },
                },
              },
            },
          },
        },
        select: {
          id: true,
        },
      })
    }),

  // Reorder stages
  reorderStages: demoProcedure
    .input(
      z.object({
        pipelineId: z.string(),
        stageIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { pipelineId, stageIds } = input

      // Verify pipeline belongs to organization
      const pipeline = await prisma.pipeline.findFirst({
        where: {
          id: pipelineId,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
      })

      if (!pipeline) {
        throw new Error('Pipeline not found')
      }

      // Update stage orders in a transaction
      const updates = stageIds.map((stageId, index) =>
        prisma.stage.update({
          where: { id: stageId },
          data: { order: index },
          select: { id: true, order: true },
        })
      )

      return await prisma.$transaction(updates)
    }),
})
