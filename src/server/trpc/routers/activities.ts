import { createTRPCRouter, orgProcedure, demoProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ActivityType } from '@prisma/client'

// Input/Output schemas
const activityFiltersSchema = z.object({
  q: z.string().optional(), // Search query
  owner: z.string().optional(), // Filter by owner ID
  type: z.nativeEnum(ActivityType).optional(), // Filter by activity type
  contact: z.string().optional(), // Filter by contact ID
  deal: z.string().optional(), // Filter by deal ID
  company: z.string().optional(), // Filter by company ID
  isCompleted: z.boolean().optional(), // Filter by completion status (for tasks)
  overdue: z.boolean().optional(), // Filter for overdue tasks
  updatedSince: z.date().optional(), // Filter by updated date
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(), // For keyset pagination
})

const activityCreateSchema = z.object({
  type: z.nativeEnum(ActivityType),
  description: z.string().min(1).max(1000),
  subject: z.string().optional(), // For emails
  body: z.string().optional(), // For emails and detailed notes
  dueDate: z.date().optional(), // For tasks
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
})

const activityUpdateSchema = z.object({
  type: z.nativeEnum(ActivityType).optional(),
  description: z.string().min(1).max(1000).optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  dueDate: z.date().optional(),
  isCompleted: z.boolean().optional(),
  contactId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
})

const activityListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      type: z.nativeEnum(ActivityType),
      description: z.string(),
      subject: z.string().nullable(),
      body: z.string().nullable(),
      dueDate: z.date().nullable(),
      isCompleted: z.boolean(),
      contact: z
        .object({
          id: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          email: z.string().nullable(),
        })
        .nullable(),
      deal: z
        .object({
          id: z.string(),
          title: z.string(),
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

export const activitiesRouter = createTRPCRouter({
  // List activities with pagination and filters
  list: orgProcedure
    .input(activityFiltersSchema)
    .output(activityListResponseSchema)
    .query(async ({ ctx, input }) => {
      const { q, owner, type, contact, deal, company, isCompleted, overdue, updatedSince, limit, cursor } =
        input

      // Build where clause
      const where: any = {
        organizationId: ctx.orgId,
        deletedAt: null,
      }

      // Add search filter using pg_trgm
      if (q && q.trim()) {
        where.OR = [
          { description: { search: q.trim() } },
          { subject: { search: q.trim() } },
          { body: { search: q.trim() } },
        ]
      }

      // Add filters
      if (owner) {
        where.ownerId = owner
      }
      if (type) {
        where.type = type
      }
      if (contact) {
        where.contactId = contact
      }
      if (deal) {
        where.dealId = deal
      }
      if (company) {
        where.companyId = company
      }
      if (isCompleted !== undefined) {
        where.isCompleted = isCompleted
      }

      // Add overdue filter for tasks
      if (overdue) {
        where.type = ActivityType.TASK
        where.dueDate = {
          lt: new Date(),
        }
        where.isCompleted = false
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
      const total = await prisma.activity.count({ where })

      // Get activities with optimized select
      const items = await prisma.activity.findMany({
        where,
        select: {
          id: true,
          type: true,
          description: true,
          subject: true,
          body: true,
          dueDate: true,
          isCompleted: true,
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          deal: {
            select: {
              id: true,
              title: true,
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

  // Get activity by ID
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const activity = await prisma.activity.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          type: true,
          description: true,
          subject: true,
          body: true,
          dueDate: true,
          isCompleted: true,
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
          deal: {
            select: {
              id: true,
              title: true,
              value: true,
              stage: {
                select: {
                  id: true,
                  name: true,
                },
              },
              pipeline: {
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
          updatedAt: true,
          createdAt: true,
        },
      })

      if (!activity) {
        throw new Error('Activity not found')
      }

      return activity
    }),

  // Create activity
  create: demoProcedure
    .input(activityCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return await prisma.activity.create({
        data: {
          ...input,
          organizationId: ctx.orgId,
          ownerId: ctx.userId,
        },
        select: {
          id: true,
          type: true,
          description: true,
          subject: true,
          body: true,
          dueDate: true,
          isCompleted: true,
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          deal: {
            select: {
              id: true,
              title: true,
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

  // Update activity (partial)
  update: demoProcedure
    .input(
      z.object({
        id: z.string(),
        data: activityUpdateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input

      return await prisma.activity.updateMany({
        where: {
          id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        data,
      })
    }),

  // Soft delete activity
  delete: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.activity.updateMany({
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

  // Restore activity
  restore: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.activity.updateMany({
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

  // Get overdue tasks for current user
  overdue: orgProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { userId, orgId } = ctx

      // Get org member
      const orgMember = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
        },
      })

      if (!orgMember) {
        return []
      }

      return await prisma.activity.findMany({
        where: {
          organizationId: orgId,
          ownerId: orgMember.id,
          type: ActivityType.TASK,
          isCompleted: false,
          dueDate: {
            lt: new Date(),
          },
          deletedAt: null,
        },
        include: {
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
          deal: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: input.limit,
      })
    }),
})
