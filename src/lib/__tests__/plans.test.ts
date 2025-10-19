import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkPlanLimit, PLAN_LIMITS } from '../plans'
import { prisma } from '../prisma'

// Mock prisma
vi.mock('../prisma', () => ({
  prisma: {
    contact: {
      count: vi.fn(),
    },
    pipeline: {
      count: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}))

describe('Plan Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkPlanLimit', () => {
    it('should allow creation when under limit', async () => {
      // Mock FREE plan organization
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: 'org-1',
        plan: 'FREE',
      } as any)

      // Mock current count of 1 contact (under FREE limit of 2000)
      vi.mocked(prisma.contact.count).mockResolvedValue(1)

      const result = await checkPlanLimit('org-1', 'contacts')

      expect(result.allowed).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should block creation when at limit', async () => {
      // Mock FREE plan organization
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: 'org-1',
        plan: 'FREE',
      } as any)

      // Mock current count at FREE limit (2000 contacts)
      vi.mocked(prisma.contact.count).mockResolvedValue(2000)

      const result = await checkPlanLimit('org-1', 'contacts')

      expect(result.allowed).toBe(false)
      expect(result.message).toBe('Limit reached. Upgrade in Settings.')
    })

    it('should allow unlimited resources for TEAM plan', async () => {
      // Mock TEAM plan organization
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: 'org-1',
        plan: 'TEAM',
      } as any)

      // Mock high count (should still be allowed)
      vi.mocked(prisma.contact.count).mockResolvedValue(100000)

      const result = await checkPlanLimit('org-1', 'contacts')

      expect(result.allowed).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should block pipeline creation when at FREE limit', async () => {
      // Mock FREE plan organization
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: 'org-1',
        plan: 'FREE',
      } as any)

      // Mock current count at FREE pipeline limit (2 pipelines)
      vi.mocked(prisma.pipeline.count).mockResolvedValue(2)

      const result = await checkPlanLimit('org-1', 'pipelines')

      expect(result.allowed).toBe(false)
      expect(result.message).toBe('Limit reached. Upgrade in Settings.')
    })

    it('should allow pipeline creation when under FREE limit', async () => {
      // Mock FREE plan organization
      vi.mocked(prisma.organization.findUnique).mockResolvedValue({
        id: 'org-1',
        plan: 'FREE',
      } as any)

      // Mock current count under FREE pipeline limit (1 pipeline)
      vi.mocked(prisma.pipeline.count).mockResolvedValue(1)

      const result = await checkPlanLimit('org-1', 'pipelines')

      expect(result.allowed).toBe(true)
      expect(result.message).toBeUndefined()
    })
  })

  describe('PLAN_LIMITS', () => {
    it('should have correct FREE plan limits', () => {
      expect(PLAN_LIMITS.FREE.contacts).toBe(2000)
      expect(PLAN_LIMITS.FREE.pipelines).toBe(2)
      expect(PLAN_LIMITS.FREE.companies).toBe(500)
      expect(PLAN_LIMITS.FREE.deals).toBe(100)
    })

    it('should have correct PRO plan limits', () => {
      expect(PLAN_LIMITS.PRO.contacts).toBe(10000)
      expect(PLAN_LIMITS.PRO.pipelines).toBe(10)
      expect(PLAN_LIMITS.PRO.companies).toBe(5000)
      expect(PLAN_LIMITS.PRO.deals).toBe(1000)
    })

    it('should have unlimited TEAM plan limits', () => {
      expect(PLAN_LIMITS.TEAM.contacts).toBe(-1)
      expect(PLAN_LIMITS.TEAM.pipelines).toBe(-1)
      expect(PLAN_LIMITS.TEAM.companies).toBe(-1)
      expect(PLAN_LIMITS.TEAM.deals).toBe(-1)
    })
  })
})
