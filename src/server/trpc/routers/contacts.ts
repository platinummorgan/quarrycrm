import { createTRPCRouter, orgProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { checkPlanLimit } from '@/lib/plans'

// Input/Output schemas
const contactFiltersSchema = z.object({
  q: z.string().optional(), // Search query
  owner: z.string().optional(), // Filter by owner ID
  company: z.string().optional(), // Filter by company ID
  updatedSince: z.date().optional(), // Filter by updated date
  limit: z.number().min(1).max(100).default(25),
  cursor: z.string().optional(), // For keyset pagination (format: "updatedAt_id")
})

const contactCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

const contactUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

const contactListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
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

export const contactsRouter = createTRPCRouter({
  // List contacts with pagination and filters
  list: orgProcedure
    .input(contactFiltersSchema)
    .output(contactListResponseSchema)
    .query(async ({ ctx, input }) => {
      const { q, owner, company, updatedSince, limit, cursor } = input

      // Build where clause
      const where: any = {
        organizationId: ctx.orgId,
        deletedAt: null,
      }

      // Add search filter using pg_trgm
      if (q && q.trim()) {
        where.OR = [
          {
            firstName: {
              search: q.trim(),
            },
          },
          {
            lastName: {
              search: q.trim(),
            },
          },
          {
            email: {
              search: q.trim(),
            },
          },
        ]
      }

      // Add owner filter
      if (owner) {
        where.ownerId = owner
      }

      // Add company filter
      if (company) {
        where.companyId = company
      }

      // Add updated since filter
      if (updatedSince) {
        where.updatedAt = {
          gte: updatedSince,
        }
      }

      // Keyset pagination using updatedAt + id as cursor
      if (cursor) {
        try {
          const [updatedAtStr, cursorId] = cursor.split('_')
          const cursorDate = new Date(updatedAtStr)
          where.OR = [
            {
              updatedAt: { lt: cursorDate },
            },
            {
              updatedAt: cursorDate,
              id: { lt: cursorId },
            },
          ]
        } catch (e) {
          // Invalid cursor, ignore
        }
      }

      // Get total count for pagination info
      const total = await prisma.contact.count({ where })

      // Get contacts with optimized select
      const items = await prisma.contact.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
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
        orderBy: [
          { updatedAt: 'desc' },
          { id: 'desc' }, // Secondary sort for stable pagination
        ],
        take: limit + 1, // Take one extra to check if there are more
      })

      const hasMore = items.length > limit
      const actualItems = hasMore ? items.slice(0, limit) : items
      const nextCursor = hasMore && actualItems.length > 0
        ? `${actualItems[actualItems.length - 1].updatedAt.toISOString()}_${actualItems[actualItems.length - 1].id}`
        : null

      return {
        items: actualItems,
        nextCursor,
        hasMore,
        total,
      }
    }),

  // Get contact by ID
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const contact = await prisma.contact.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
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

      if (!contact) {
        throw new Error('Contact not found')
      }

      return contact
    }),

  // Create contact
  create: orgProcedure
    .input(contactCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // Check plan limits
      const limitCheck = await checkPlanLimit(ctx.orgId, 'contacts')
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.message || 'Plan limit reached')
      }

      return await prisma.contact.create({
        data: {
          ...input,
          organizationId: ctx.orgId,
          ownerId: ctx.userId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
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

  // Update contact (partial)
  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        data: contactUpdateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input

      return await prisma.contact.updateMany({
        where: {
          id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        data,
      })
    }),

  // Soft delete contact
  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.contact.updateMany({
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

  // Restore contact
  restore: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.contact.updateMany({
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
})
