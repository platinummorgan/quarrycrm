import { createTRPCRouter, orgProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dashboardRouter = createTRPCRouter({
  // Get dashboard stats
  stats: orgProcedure.query(async ({ ctx }) => {
    const [contactsCount, companiesCount, dealsCount, activitiesCount] =
      await Promise.all([
        prisma.contact.count({
          where: {
            organizationId: ctx.orgId,
            deletedAt: null,
          },
        }),
        prisma.company.count({
          where: {
            organizationId: ctx.orgId,
            deletedAt: null,
          },
        }),
        prisma.deal.count({
          where: {
            organizationId: ctx.orgId,
            deletedAt: null,
          },
        }),
        prisma.activity.count({
          where: {
            organizationId: ctx.orgId,
            deletedAt: null,
          },
        }),
      ])

    return {
      contacts: contactsCount,
      companies: companiesCount,
      deals: dealsCount,
      activities: activitiesCount,
    }
  }),

  // Get recent activity
  recentActivity: orgProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      const activities = await prisma.activity.findMany({
        where: {
          organizationId: ctx.orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          type: true,
          description: true,
          createdAt: true,
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          deal: {
            select: {
              id: true,
              title: true,
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
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input.limit,
      })

      return activities
    }),
})
