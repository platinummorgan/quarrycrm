import { createTRPCRouter, orgProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const organizationUpdateSchema = z.object({
  name: z.string().optional(),
  domain: z.string().optional(),
  description: z.string().optional(),
  emailLogAddress: z.string().nullable().optional(),
})

export const organizationsRouter = createTRPCRouter({
  // Get current organization
  getCurrent: orgProcedure.query(async ({ ctx }) => {
    return await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        id: true,
        name: true,
        domain: true,
        description: true,
        emailLogAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }),

  // Update organization
  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        data: organizationUpdateSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input

      // Ensure user can only update their own organization
      if (id !== ctx.orgId) {
        throw new Error('Unauthorized')
      }

      return await prisma.organization.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          domain: true,
          description: true,
          emailLogAddress: true,
          updatedAt: true,
        },
      })
    }),
})