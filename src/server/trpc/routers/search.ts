import { z } from 'zod'
import { createTRPCRouter, orgProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'

export const searchRouter = createTRPCRouter({
  global: orgProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
        types: z.array(z.enum(['contact', 'company', 'deal'])).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { query, limit, types = ['contact', 'company', 'deal'] } = input
      const organizationId = ctx.orgId

      const results: Array<{
        id: string
        type: 'contact' | 'company' | 'deal'
        title: string
        subtitle?: string
        url: string
        metadata?: Record<string, any>
      }> = []

      // Search contacts
      if (types.includes('contact')) {
        const contacts = await prisma.contact.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              {
                firstName: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
          include: {
            company: {
              select: { name: true },
            },
            owner: {
              select: { user: { select: { name: true } } },
            },
          },
          take: limit,
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' },
          ],
        })

        results.push(
          ...contacts.map((contact) => ({
            id: contact.id,
            type: 'contact' as const,
            title: `${contact.firstName} ${contact.lastName}`,
            subtitle: contact.company?.name || contact.email || undefined,
            url: `/app/contacts/${contact.id}`,
            metadata: {
              email: contact.email,
              phone: contact.phone,
              owner: contact.owner.user.name,
            },
          }))
        )
      }

      // Search companies
      if (types.includes('company')) {
        const companies = await prisma.company.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              {
                name: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                domain: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                website: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
          include: {
            owner: {
              select: { user: { select: { name: true } } },
            },
            _count: {
              select: { contacts: true, deals: true },
            },
          },
          take: limit,
          orderBy: { name: 'asc' },
        })

        results.push(
          ...companies.map((company) => ({
            id: company.id,
            type: 'company' as const,
            title: company.name,
            subtitle: company.domain || company.website || undefined,
            url: `/app/companies/${company.id}`,
            metadata: {
              industry: company.industry,
              owner: company.owner.user.name,
              contactsCount: company._count.contacts,
              dealsCount: company._count.deals,
            },
          }))
        )
      }

      // Search deals
      if (types.includes('deal')) {
        const deals = await prisma.deal.findMany({
          where: {
            organizationId,
            deletedAt: null,
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          include: {
            company: {
              select: { name: true },
            },
            contact: {
              select: { firstName: true, lastName: true },
            },
            stage: {
              select: { name: true },
            },
            pipeline: {
              select: { name: true },
            },
            owner: {
              select: { user: { select: { name: true } } },
            },
          },
          take: limit,
          orderBy: [
            { updatedAt: 'desc' },
            { title: 'asc' },
          ],
        })

        results.push(
          ...deals.map((deal) => ({
            id: deal.id,
            type: 'deal' as const,
            title: deal.title,
            subtitle: deal.company?.name || (deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : undefined),
            url: `/app/deals/${deal.id}`,
            metadata: {
              value: deal.value,
              probability: deal.probability,
              stage: deal.stage?.name,
              pipeline: deal.pipeline?.name,
              owner: deal.owner.user.name,
              expectedClose: deal.expectedClose,
            },
          }))
        )
      }

      // Sort results by relevance (simple implementation)
      results.sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.title.toLowerCase().includes(query.toLowerCase())
        const bExact = b.title.toLowerCase().includes(query.toLowerCase())

        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1

        // Then by type priority
        const typeOrder = { contact: 0, company: 1, deal: 2 }
        return typeOrder[a.type] - typeOrder[b.type]
      })

      return results.slice(0, limit)
    }),
})