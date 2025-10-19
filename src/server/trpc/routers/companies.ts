import { createTRPCRouter, orgProcedure, demoProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Input/Output schemas
const companyFiltersSchema = z.object({
  q: z.string().optional(), // Search query
  owner: z.string().optional(), // Filter by owner ID
  industry: z.string().optional(), // Filter by industry
  updatedSince: z.date().optional(), // Filter by updated date
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(), // For keyset pagination
})

const companyCreateSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  domain: z.string().optional(),
  ownerId: z.string().optional(), // Optional owner, defaults to current user
})

const companyUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  domain: z.string().optional(),
})

const companyListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      website: z.string().nullable(),
      industry: z.string().nullable(),
      domain: z.string().nullable(),
      owner: z.object({
        id: z.string(),
        user: z.object({
          id: z.string(),
          name: z.string().nullable(),
          email: z.string(),
        }),
      }),
      _count: z.object({
        contacts: z.number(),
        deals: z.number(),
      }),
      updatedAt: z.date(),
      createdAt: z.date(),
    })
  ),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  total: z.number(),
})

export const companiesRouter = createTRPCRouter({
  // List companies with pagination and filters
  list: orgProcedure
    .input(companyFiltersSchema)
    .output(companyListResponseSchema)
    .query(async ({ ctx, input }) => {
      const { q, owner, industry, updatedSince, limit, cursor } = input

      // Build where clause
      const where: any = {
        organizationId: ctx.orgId,
        deletedAt: null,
      }

      // Add search filter using pg_trgm
      if (q && q.trim()) {
        where.OR = [
          {
            name: {
              search: q.trim(),
            },
          },
          {
            domain: {
              search: q.trim(),
            },
          },
        ]
      }

      // Add owner filter
      if (owner) {
        where.ownerId = owner
      }

      // Add industry filter
      if (industry) {
        where.industry = industry
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
      const total = await prisma.company.count({ where })

      // Get companies with optimized select
      const items = await prisma.company.findMany({
        where,
        select: {
          id: true,
          name: true,
          website: true,
          industry: true,
          domain: true,
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
          _count: {
            select: {
              contacts: true,
              deals: true,
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

  // Get company by ID
  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await prisma.company.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          website: true,
          industry: true,
          description: true,
          domain: true,
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
          contacts: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: 10,
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
          updatedAt: true,
          createdAt: true,
        },
      })

      if (!company) {
        throw new Error('Company not found')
      }

      return company
    }),

  // Create company
  create: demoProcedure
    .input(companyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { ownerId, ...data } = input
      return await prisma.company.create({
        data: {
          ...data,
          organizationId: ctx.orgId,
          ownerId: ownerId || (ctx as any).membership.id,
        },
        select: {
          id: true,
          name: true,
          website: true,
          industry: true,
          description: true,
          domain: true,
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

  // Update company (partial)
  update: demoProcedure
    .input(
      z.object({
        id: z.string(),
        data: companyUpdateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input

      return await prisma.company.updateMany({
        where: {
          id,
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        data,
      })
    }),

  // Soft delete company
  delete: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.company.updateMany({
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

  // Restore company
  restore: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await prisma.company.updateMany({
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

  // List owner options for dropdowns
  listOwnerOptions: orgProcedure.query(async ({ ctx }) => {
    const members = await prisma.orgMember.findMany({
      where: { organizationId: ctx.orgId },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return members.map((m) => ({
      id: m.id,
      label: m.user?.name ?? m.user?.email ?? 'Member',
      subLabel: m.user?.email ?? '',
    }))
  }),

  // Search companies for combobox/dropdown
  search: orgProcedure
    .input(z.object({
      q: z.string().optional(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const { q, limit } = input

      const where: any = {
        organizationId: ctx.orgId,
        deletedAt: null,
      }

      // Add search filter using pg_trgm
      if (q && q.trim()) {
        where.OR = [
          {
            name: {
              search: q.trim(),
            },
          },
          {
            domain: {
              search: q.trim(),
            },
          },
        ]
      }

      const companies = await prisma.company.findMany({
        where,
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
        take: limit,
      })

      return companies
    }),
})
