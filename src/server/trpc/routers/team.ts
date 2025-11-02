import { z } from 'zod'
import { createTRPCRouter, orgProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const teamRouter = createTRPCRouter({
  // Invite a team member
  invite: orgProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(['ADMIN', 'MEMBER']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, orgId, membership } = ctx

      if (!membership) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in',
        })
      }

      // Check if user is admin/owner
      if (membership.role !== 'ADMIN' && membership.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can invite team members',
        })
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      })

      if (existingUser) {
        // Check if already a member
        const existingMember = await prisma.orgMember.findFirst({
          where: {
            organizationId: orgId,
            userId: existingUser.id,
          },
        })

        if (existingMember) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User is already a team member',
          })
        }

        // Add as member
        await prisma.orgMember.create({
          data: {
            organizationId: orgId,
            userId: existingUser.id,
            role: input.role,
          },
        })

        // TODO: Send notification email

        return { success: true, message: 'User added to team' }
      }

      // TODO: Create invitation record and send invitation email
      // For now, just return a message
      throw new TRPCError({
        code: 'NOT_FOUND',
        message:
          'User not found. They need to sign up first, then you can add them.',
      })
    }),

  // Update member role
  updateRole: orgProcedure
    .input(
      z.object({
        memberId: z.string(),
        role: z.enum(['ADMIN', 'MEMBER']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, orgId, membership } = ctx

      if (!membership) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in',
        })
      }

      // Check if user is admin/owner
      if (membership.role !== 'ADMIN' && membership.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can update roles',
        })
      }

      // Verify member belongs to organization
      const member = await prisma.orgMember.findFirst({
        where: {
          id: input.memberId,
          organizationId: orgId,
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        })
      }

      // Can't change owner role
      if (member.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot change owner role',
        })
      }

      await prisma.orgMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
      })

      return { success: true }
    }),

  // Remove team member
  remove: orgProcedure
    .input(
      z.object({
        memberId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma, orgId, membership } = ctx

      if (!membership) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You must be logged in',
        })
      }

      // Check if user is admin/owner
      if (membership.role !== 'ADMIN' && membership.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins can remove team members',
        })
      }

      // Verify member belongs to organization
      const member = await prisma.orgMember.findFirst({
        where: {
          id: input.memberId,
          organizationId: orgId,
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Team member not found',
        })
      }

      // Can't remove owner
      if (member.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove owner',
        })
      }

      // Reassign their deals to the requesting user
      await prisma.deal.updateMany({
        where: {
          ownerId: input.memberId,
          organizationId: orgId,
        },
        data: {
          ownerId: membership.id,
        },
      })

      // Remove member
      await prisma.orgMember.delete({
        where: { id: input.memberId },
      })

      return { success: true }
    }),
})
