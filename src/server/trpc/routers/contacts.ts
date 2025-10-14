import { createTRPCRouter, orgProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Input/Output schemas
const contactFiltersSchema = z.object({
  q: z.string().optional(), // Search query
  owner: z.string().optional(), // Filter by owner ID
  company: z.string().optional(), // Filter by company ID
  updatedSince: z.date().optional(), // Filter by updated date
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(), // For keyset pagination
})

const contactCreateSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyId: z.string().optional(),
})

const contactUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyId: z.string().nullable().optional(),
})

const contactListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
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

      // Keyset pagination using updatedAt as cursor
      if (cursor) {
        const cursorDate = new Date(cursor)
        where.updatedAt = {
          ...where.updatedAt,
          lt: cursorDate,
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
          deals: {
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
            orderBy: {
              updatedAt: 'desc',
            },
            take: 5,
          },
          activities: {
            select: {
              id: true,
              type: true,
              description: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
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
