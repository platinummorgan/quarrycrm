import { z } from 'zod'
import { createTRPCRouter, orgProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const photosRouter = createTRPCRouter({
  // Create a new photo
  create: orgProcedure
    .input(
      z.object({
        dealId: z.string(),
        imageData: z.string(), // base64 encoded image
        label: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, orgId, membership } = ctx

      if (!orgId || !membership) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to upload photos',
        })
      }

      // Verify the deal belongs to the organization
      const deal = await prisma.deal.findFirst({
        where: {
          id: input.dealId,
          organizationId: orgId,
        },
      })

      if (!deal) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deal not found',
        })
      }

      // In production, you would upload to a storage service like S3, Cloudinary, or Vercel Blob
      // For now, we'll store base64 in the database (not recommended for production)
      // TODO: Integrate with a proper image storage service

      const photo = await prisma.photo.create({
        data: {
          dealId: input.dealId,
          organizationId: orgId,
          uploadedById: membership.id,
          url: input.imageData,
          thumbnailUrl: input.imageData, // TODO: Generate thumbnail
          label: input.label,
        },
        include: {
          uploadedBy: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })

      return photo
    }),

  // List photos for a deal
  list: orgProcedure
    .input(
      z.object({
        dealId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma, orgId } = ctx

      if (!orgId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in',
        })
      }

      const photos = await prisma.photo.findMany({
        where: {
          dealId: input.dealId,
          organizationId: orgId,
        },
        include: {
          uploadedBy: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return photos
    }),

  // Delete a photo
  delete: orgProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, orgId } = ctx

      if (!orgId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in',
        })
      }

      // Verify the photo belongs to the organization
      const photo = await prisma.photo.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
        },
      })

      if (!photo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Photo not found',
        })
      }

      // TODO: Delete from storage service

      await prisma.photo.delete({
        where: {
          id: input.id,
        },
      })

      return { success: true }
    }),
})
