export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/auth-helpers'
import { JobDetailView } from '@/components/deals/JobDetailView'

async function getJobDetail(jobId: string, orgId: string) {
  const deal = await prisma.deal.findFirst({
    where: {
      id: jobId,
      organizationId: orgId,
      deletedAt: null,
    },
    include: {
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      stage: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      pipeline: {
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
      activities: {
        orderBy: {
          createdAt: 'desc',
        },
        include: {
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
      },
    },
  })

  if (!deal) {
    notFound()
  }

  return deal
}

export default async function JobDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { orgId } = await requireOrg()
  const job = await getJobDetail(params.id, orgId)

  return (
    <div className="space-y-6">
      <JobDetailView job={job} />
    </div>
  )
}
