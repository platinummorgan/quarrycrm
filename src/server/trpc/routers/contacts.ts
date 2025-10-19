import { createTRPCRouter, orgProcedure, demoProcedure, rateLimitedProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { checkPlanLimit } from '@/lib/plans'
import { WriteRateLimits } from '@/lib/rate-limit'

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
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  ownerId: z.string().cuid().optional(),
  notes: z.string().optional().nullable(),
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

  // List owner options for dropdowns
  listOwnerOptions: orgProcedure.query(async ({ ctx }) => {
    const members = await prisma.orgMember.findMany({
      where: { organizationId: (ctx as any).org.id },
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
          notes: true,
          companyId: true,
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
  create: rateLimitedProcedure(WriteRateLimits.CONTACTS)
    .use(demoProcedure._def.middlewares[0]) // Apply demo check
    .input(contactCreateSchema)
    .mutation(async ({ ctx, input }) => {
      // 1) Ensure org + membership exist on the request context
      const org = (ctx as any).org
      const me = (ctx as any).membership
      if (!org || !me) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No organization context found',
        })
      }

      // 2) Pick an owner: explicit or default to current member
      const ownerId = input.ownerId ?? me.id

      // 3) Validate owner belongs to this org
      const owner = await prisma.orgMember.findFirst({
        where: { id: ownerId, organizationId: org.id },
        select: { id: true },
      })
      if (!owner) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Owner must be a member of this organization',
        })
      }

      // 4) If a company is provided, validate it belongs to this org
      if (input.companyId) {
        const company = await prisma.company.findFirst({
          where: { id: input.companyId, organizationId: org.id },
          select: { id: true },
        })
        if (!company) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Company not found in this organization',
          })
        }
      }

      // 5) Create the contact
      try {
        const contact = await prisma.contact.create({
          data: {
            organizationId: org.id,
            ownerId,
            companyId: input.companyId ?? null,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email ?? null,
            phone: input.phone ?? null,
            notes: input.notes ?? null,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            ownerId: true,
            companyId: true,
            createdAt: true,
          },
        })
        return contact
      } catch (err: any) {
        // Map common Prisma errors to clear API errors
        if (err?.code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A contact with this unique value already exists',
          })
        }
        if (err?.code === 'P2003') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Foreign key constraint failed (owner/company/org)',
          })
        }
        // Fallthrough
        console.error('contacts.create failed:', err)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' })
      }
    }),

  // Update contact (partial)
  update: rateLimitedProcedure(WriteRateLimits.CONTACTS)
    .use(demoProcedure._def.middlewares[0]) // Apply demo check
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
  delete: rateLimitedProcedure(WriteRateLimits.CONTACTS)
    .use(demoProcedure._def.middlewares[0]) // Apply demo check
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
  restore: demoProcedure
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
