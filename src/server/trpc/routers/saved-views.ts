import { z } from 'zod'
import { createTRPCRouter, orgProcedure, demoProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'

const createSavedViewSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  entityType: z.enum(['CONTACT', 'COMPANY', 'DEAL']),
  filters: z.record(z.any()),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  isPublic: z.boolean().default(false),
  isStarred: z.boolean().default(false),
})

const updateSavedViewSchema = createSavedViewSchema.partial().extend({
  id: z.string(),
})

export const savedViewsRouter = createTRPCRouter({
  // Get all saved views for the current user/organization
  list: orgProcedure
    .input(
      z.object({
        entityType: z.enum(['CONTACT', 'COMPANY', 'DEAL']).optional(),
        includePublic: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      const where = {
        organizationId: orgId,
        OR: [
          { ownerId: userId }, // User's own views
          ...(input.includePublic ? [{ isPublic: true }] : []), // Public views
        ],
        ...(input.entityType && { entityType: input.entityType }),
      }

      return prisma.savedView.findMany({
        where,
        orderBy: [
          { isStarred: 'desc' },
          { updatedAt: 'desc' },
        ],
        include: {
          owner: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      })
    }),

  // Get a specific saved view by ID
  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      const view = await prisma.savedView.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
          OR: [
            { ownerId: userId },
            { isPublic: true },
          ],
        },
        include: {
          owner: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      })

      if (!view) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Saved view not found',
        })
      }

      return view
    }),

  // Get a public saved view by URL
  getByUrl: orgProcedure
    .input(z.object({ viewUrl: z.string() }))
    .query(async ({ ctx, input }) => {
      const { orgId } = ctx

      const view = await prisma.savedView.findFirst({
        where: {
          viewUrl: input.viewUrl,
          organizationId: orgId,
          isPublic: true,
        },
        include: {
          owner: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      })

      if (!view) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Public view not found',
        })
      }

      return view
    }),

  // Create a new saved view
  create: demoProcedure
    .input(createSavedViewSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Generate unique URL for public views
      const viewUrl = input.isPublic ? nanoid(10) : null

      return prisma.savedView.create({
        data: {
          ...input,
          entity: input.entityType,
          viewUrl,
          organizationId: orgId,
          ownerId: userId,
        },
        include: {
          owner: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      })
    }),

  // Update an existing saved view
  update: demoProcedure
    .input(updateSavedViewSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx
      const { id, ...updateData } = input

      // Check if view exists and user has permission
      const existingView = await prisma.savedView.findFirst({
        where: {
          id,
          organizationId: orgId,
          ownerId: userId, // Only owner can update
        },
        select: {
          id: true,
          name: true,
          description: true,
          entity: true,
          entityType: true,
          filters: true,
          sortBy: true,
          sortOrder: true,
          isPublic: true,
          isStarred: true,
          viewUrl: true,
          organizationId: true,
          ownerId: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (!existingView) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Saved view not found or access denied',
        })
      }

      // Generate new URL if making public and doesn't have one
      const viewUrl = updateData.isPublic && !existingView.viewUrl
        ? nanoid(10)
        : updateData.isPublic === false
        ? null
        : existingView.viewUrl

      return prisma.savedView.update({
        where: { id },
        data: {
          ...updateData,
          viewUrl,
        },
        include: {
          owner: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      })
    }),

  // Delete a saved view
  delete: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Check if view exists and user has permission
      const existingView = await prisma.savedView.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
          ownerId: userId, // Only owner can delete
        },
      })

      if (!existingView) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Saved view not found or access denied',
        })
      }

      await prisma.savedView.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Duplicate a saved view
  duplicate: demoProcedure
    .input(z.object({ id: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Get the original view
      const originalView = await prisma.savedView.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
          OR: [
            { ownerId: userId },
            { isPublic: true },
          ],
        },
        select: {
          name: true,
          description: true,
          entityType: true,
          filters: true,
          sortBy: true,
          sortOrder: true,
          isPublic: true,
        },
      })

      if (!originalView) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Saved view not found',
        })
      }

      // Generate new URL if original was public
      const viewUrl = originalView.isPublic ? nanoid(10) : null

      return prisma.savedView.create({
        data: {
          name: input.name || `${originalView.name} (Copy)`,
          description: originalView.description,
          entityType: originalView.entityType,
          entity: originalView.entityType!,
          filters: originalView.filters as any,
          sortBy: originalView.sortBy,
          sortOrder: originalView.sortOrder,
          isPublic: false, // Duplicates are private by default
          isStarred: false, // Not starred by default
          viewUrl,
          organizationId: orgId,
          ownerId: userId,
        },
        include: {
          owner: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      })
    }),

  // Toggle star status
  toggleStar: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Check if view exists and user has permission
      const existingView = await prisma.savedView.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
          OR: [
            { ownerId: userId },
            { isPublic: true },
          ],
        },
      })

      if (!existingView) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Saved view not found',
        })
      }

      return prisma.savedView.update({
        where: { id: input.id },
        data: {
          isStarred: !existingView.isStarred,
        },
        include: {
          owner: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      })
    }),
})
