import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDeals, getPipelines, moveDealToStage } from '@/server/deals'
import { prisma } from '@/lib/prisma'

// Mock the auth helpers
vi.mock('@/lib/auth-helpers', () => ({
  requireOrg: vi.fn().mockResolvedValue({
    orgId: 'test-org-id',
    userId: 'test-user-id',
  }),
}))

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    deal: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    pipeline: {
      findMany: vi.fn(),
    },
    stage: {
      findFirst: vi.fn(),
    },
  },
}))

describe('Deals Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDeals', () => {
    it('should return deals with proper pagination and filtering', async () => {
      const mockDeals = [
        {
          id: 'deal-1',
          title: 'Test Deal',
          value: 10000,
          probability: 75,
          expectedClose: new Date(),
          updatedAt: new Date(),
          createdAt: new Date(),
          stage: {
            id: 'stage-1',
            name: 'Proposal',
            color: '#ff0000',
          },
          pipeline: {
            id: 'pipeline-1',
            name: 'Sales Pipeline',
          },
          contact: {
            id: 'contact-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          company: null,
          owner: {
            id: 'owner-1',
            user: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com',
            },
          },
        },
      ]

      ;(prisma.deal.count as any).mockResolvedValue(1)
      ;(prisma.deal.findMany as any).mockResolvedValue(mockDeals)

      const result = await getDeals({ pipeline: 'pipeline-1', limit: 25 })

      expect(result).toEqual({
        items: mockDeals,
        nextCursor: null,
        hasMore: false,
        total: 1,
      })

      expect(prisma.deal.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'test-org-id',
          deletedAt: null,
          pipelineId: 'pipeline-1',
        },
      })

      expect(prisma.deal.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'test-org-id',
          deletedAt: null,
          pipelineId: 'pipeline-1',
        },
        select: expect.any(Object),
        orderBy: [
          { updatedAt: 'desc' },
          { id: 'desc' },
        ],
        take: 26,
      })
    })

    it('should handle search queries', async () => {
      ;(prisma.deal.count as any).mockResolvedValue(0)
      ;(prisma.deal.findMany as any).mockResolvedValue([])

      await getDeals({ q: 'test deal', limit: 25 })

      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { search: 'test deal' } },
              { contact: { firstName: { search: 'test deal' } } },
              { contact: { lastName: { search: 'test deal' } } },
              { contact: { email: { search: 'test deal' } } },
              { company: { name: { search: 'test deal' } } },
            ],
          }),
        })
      )
    })
  })

  describe('getPipelines', () => {
    it('should return pipelines with stages and deal counts', async () => {
      const mockPipelines = [
        {
          id: 'pipeline-1',
          name: 'Sales Pipeline',
          description: 'Main sales pipeline',
          isDefault: true,
          stages: [
            {
              id: 'stage-1',
              name: 'Lead',
              order: 1,
              color: '#ff0000',
              _count: {
                deals: 5,
              },
            },
            {
              id: 'stage-2',
              name: 'Proposal',
              order: 2,
              color: '#00ff00',
              _count: {
                deals: 3,
              },
            },
          ],
        },
      ]

      ;(prisma.pipeline.findMany as any).mockResolvedValue(mockPipelines)

      const result = await getPipelines()

      expect(result).toEqual(mockPipelines)
      expect(prisma.pipeline.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'test-org-id',
          deletedAt: null,
        },
        select: expect.any(Object),
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' },
        ],
      })
    })
  })

  describe('moveDealToStage', () => {
    it('should successfully move a deal to a different stage', async () => {
      const mockDeal = {
        id: 'deal-1',
        stageId: 'stage-1',
        pipelineId: 'pipeline-1',
      }

      const mockUpdatedDeal = {
        id: 'deal-1',
        stage: {
          id: 'stage-2',
          name: 'Proposal',
          color: '#00ff00',
        },
      }

      ;(prisma.deal.findFirst as any).mockResolvedValue(mockDeal)
      ;(prisma.stage.findFirst as any).mockResolvedValue({
        id: 'stage-2',
        pipelineId: 'pipeline-1',
      })
      ;(prisma.deal.update as any).mockResolvedValue(mockUpdatedDeal)

      const result = await moveDealToStage({
        dealId: 'deal-1',
        stageId: 'stage-2',
      })

      expect(result).toEqual(mockUpdatedDeal)
      expect(prisma.deal.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'deal-1',
          organizationId: 'test-org-id',
          deletedAt: null,
        },
        select: {
          id: true,
          stageId: true,
          pipelineId: true,
        },
      })

      expect(prisma.stage.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'stage-2',
          pipelineId: 'pipeline-1',
        },
        select: {
          id: true,
          pipelineId: true,
        },
      })

      expect(prisma.deal.update).toHaveBeenCalledWith({
        where: {
          id: 'deal-1',
        },
        data: {
          stageId: 'stage-2',
        },
        select: {
          id: true,
          stage: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      })
    })

    it('should throw error if deal not found', async () => {
      ;(prisma.deal.findFirst as any).mockResolvedValue(null)

      await expect(
        moveDealToStage({
          dealId: 'nonexistent-deal',
          stageId: 'stage-1',
        })
      ).rejects.toThrow('Deal not found')
    })

    it('should throw error if stage not found or belongs to different pipeline', async () => {
      ;(prisma.deal.findFirst as any).mockResolvedValue({
        id: 'deal-1',
        stageId: 'stage-1',
        pipelineId: 'pipeline-1',
      })
      ;(prisma.stage.findFirst as any).mockResolvedValue(null)

      await expect(
        moveDealToStage({
          dealId: 'deal-1',
          stageId: 'stage-2',
        })
      ).rejects.toThrow('Stage not found or does not belong to the deal\'s pipeline')
    })
  })
})