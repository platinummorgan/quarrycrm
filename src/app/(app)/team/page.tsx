export const dynamic = 'force-dynamic'

import { requireOrg } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { TeamManagementView } from '@/components/team/TeamManagementView'

async function getTeamMembers(orgId: string) {
  const members = await prisma.orgMember.findMany({
    where: {
      organizationId: orgId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  // Get activity counts for each member
  const memberStats = await Promise.all(
    members.map(async (member) => {
      const [assignedDeals, recentActivities] = await Promise.all([
        prisma.deal.count({
          where: {
            ownerId: member.id,
            organizationId: orgId,
            deletedAt: null,
          },
        }),
        prisma.activity.count({
          where: {
            ownerId: member.id,
            organizationId: orgId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
      ])

      return {
        ...member,
        stats: {
          assignedDeals,
          recentActivities,
        },
      }
    })
  )

  return memberStats
}

export default async function TeamPage() {
  const { orgId, membership } = await requireOrg()

  // Check if user is admin/owner
  const isAdmin = membership.role === 'ADMIN' || membership.role === 'OWNER'

  const members = await getTeamMembers(orgId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Manage team members and their roles
          </p>
        </div>
      </div>

      <TeamManagementView members={members} isAdmin={isAdmin} />
    </div>
  )
}
