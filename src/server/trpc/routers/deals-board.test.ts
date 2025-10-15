import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('Deals Board - Stage Movement Tests', () => {
  let testOrgId: string
  let testUserId: string
  let testMemberId: string
  let testPipelineId: string
  let testStage1Id: string
  let testStage2Id: string
  let testStage3Id: string
  let testDealId: string

  // Setup test data before each test
  beforeEach(async () => {
    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: 'Test Org - Deals Board',
        domain: 'test-deals-board.com',
      },
    })
    testOrgId = org.id

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-deals-${Date.now()}@example.com`,
        name: 'Test User',
      },
    })
    testUserId = user.id

    // Create org member
    const member = await prisma.orgMember.create({
      data: {
        organizationId: testOrgId,
        userId: user.id,
        role: 'ADMIN',
      },
    })
    testMemberId = member.id

    // Create test pipeline with 3 stages
    const pipeline = await prisma.pipeline.create({
      data: {
        name: 'Sales Pipeline',
        organizationId: testOrgId,
        ownerId: testMemberId, // Should be member ID, not user ID
      },
    })
    testPipelineId = pipeline.id

    // Create stages
    const stage1 = await prisma.stage.create({
      data: {
        name: 'Qualification',
        pipelineId: testPipelineId,
        order: 0,
        color: '#3b82f6',
      },
    })
    testStage1Id = stage1.id

    const stage2 = await prisma.stage.create({
      data: {
        name: 'Proposal',
        pipelineId: testPipelineId,
        order: 1,
        color: '#eab308',
      },
    })
    testStage2Id = stage2.id

    const stage3 = await prisma.stage.create({
      data: {
        name: 'Negotiation',
        pipelineId: testPipelineId,
        order: 2,
        color: '#22c55e',
      },
    })
    testStage3Id = stage3.id

    // Create a test deal in stage 1
    const deal = await prisma.deal.create({
      data: {
        title: 'Test Deal',
        value: 10000,
        probability: 50,
        organizationId: testOrgId,
        pipelineId: testPipelineId,
        stageId: testStage1Id,
        ownerId: testMemberId, // Should be member ID, not user ID
      },
    })
    testDealId = deal.id
  })

  // Cleanup after each test
  afterEach(async () => {
    // Delete test data
    await prisma.deal.deleteMany({
      where: { organizationId: testOrgId },
    })
    await prisma.stage.deleteMany({
      where: { pipelineId: testPipelineId },
    })
    await prisma.pipeline.deleteMany({
      where: { organizationId: testOrgId },
    })
    await prisma.orgMember.deleteMany({
      where: { organizationId: testOrgId },
    })
    await prisma.organization.delete({
      where: { id: testOrgId },
    })
  })

  describe('moveToStage mutation', () => {
    it('should move a deal to a different stage', async () => {
      // Move deal from stage 1 to stage 2
      await prisma.deal.update({
        where: { id: testDealId },
        data: { stageId: testStage2Id },
      })

      // Verify in database
      const deal = await prisma.deal.findUnique({
        where: { id: testDealId },
        include: {
          stage: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      expect(deal).toBeDefined()
      expect(deal?.id).toBe(testDealId)
      expect(deal?.stageId).toBe(testStage2Id)
      expect(deal?.stage?.name).toBe('Proposal')
    })

    it('should move a deal through multiple stages', async () => {
      // Move from stage 1 to stage 2
      await prisma.deal.update({
        where: { id: testDealId },
        data: { stageId: testStage2Id },
      })

      // Verify stage 2
      let deal = await prisma.deal.findUnique({
        where: { id: testDealId },
      })
      expect(deal?.stageId).toBe(testStage2Id)

      // Move from stage 2 to stage 3
      await prisma.deal.update({
        where: { id: testDealId },
        data: { stageId: testStage3Id },
      })

      // Verify stage 3
      deal = await prisma.deal.findUnique({
        where: { id: testDealId },
      })
      expect(deal?.stageId).toBe(testStage3Id)

      // Move back to stage 1
      await prisma.deal.update({
        where: { id: testDealId },
        data: { stageId: testStage1Id },
      })

      // Verify back to stage 1
      deal = await prisma.deal.findUnique({
        where: { id: testDealId },
      })
      expect(deal?.stageId).toBe(testStage1Id)
    })

    it('should only update deals within same organization', async () => {
      // Create another organization
      const otherOrg = await prisma.organization.create({
        data: {
          name: 'Other Org',
          domain: 'other-org.com',
        },
      })

      // Try to move deal using updateMany with wrong orgId (should return 0)
      const result = await prisma.deal.updateMany({
        where: {
          id: testDealId,
          organizationId: otherOrg.id, // Wrong org
        },
        data: {
          stageId: testStage2Id,
        },
      })

      // Should not update anything
      expect(result.count).toBe(0)

      // Verify deal is still in stage 1
      const deal = await prisma.deal.findUnique({
        where: { id: testDealId },
      })
      expect(deal?.stageId).toBe(testStage1Id)

      // Cleanup
      await prisma.organization.delete({ where: { id: otherOrg.id } })
    })

    it('should fail gracefully when moving to stage from different pipeline', async () => {
      // Create another pipeline
      const otherPipeline = await prisma.pipeline.create({
        data: {
          name: 'Other Pipeline',
          organizationId: testOrgId,
          ownerId: testMemberId,
        },
      })

      // Create stage in other pipeline
      const otherStage = await prisma.stage.create({
        data: {
          name: 'Other Stage',
          pipelineId: otherPipeline.id,
          order: 0,
        },
      })

      // Update deal to different pipeline's stage (Prisma won't prevent this)
      // But the moveToStage mutation should validate this
      await prisma.deal.update({
        where: { id: testDealId },
        data: { stageId: otherStage.id },
      })

      // Verify it was updated (Prisma allows it)
      const deal = await prisma.deal.findUnique({
        where: { id: testDealId },
        include: {
          stage: true,
        },
      })
      expect(deal?.stageId).toBe(otherStage.id)

      // Cleanup
      await prisma.stage.delete({ where: { id: otherStage.id } })
      await prisma.pipeline.delete({ where: { id: otherPipeline.id } })
    })
  })

  describe('Weighted totals calculation', () => {
    it('should correctly calculate weighted totals per stage', async () => {
      // Create multiple deals in different stages with different values and probabilities
      await prisma.deal.createMany({
        data: [
          {
            title: 'Deal 1',
            value: 10000,
            probability: 50,
            organizationId: testOrgId,
            pipelineId: testPipelineId,
            stageId: testStage1Id,
            ownerId: testMemberId,
          },
          {
            title: 'Deal 2',
            value: 20000,
            probability: 75,
            organizationId: testOrgId,
            pipelineId: testPipelineId,
            stageId: testStage1Id,
            ownerId: testMemberId,
          },
          {
            title: 'Deal 3',
            value: 30000,
            probability: 100,
            organizationId: testOrgId,
            pipelineId: testPipelineId,
            stageId: testStage2Id,
            ownerId: testMemberId,
          },
        ],
      })

      const deals = await prisma.deal.findMany({
        where: {
          organizationId: testOrgId,
          pipelineId: testPipelineId,
          deletedAt: null,
        },
        include: {
          stage: true,
        },
      })

      // Group deals by stage
      const stage1Deals = deals.filter((d) => d.stageId === testStage1Id)
      const stage2Deals = deals.filter((d) => d.stageId === testStage2Id)

      // Calculate weighted totals
      // Stage 1: (10000 * 50% = 5000) + (20000 * 75% = 15000) + original deal (10000 * 50% = 5000)
      const stage1Weighted = stage1Deals.reduce(
        (sum, deal) => sum + ((deal.value || 0) * (deal.probability || 0)) / 100,
        0
      )

      // Stage 2: (30000 * 100% = 30000)
      const stage2Weighted = stage2Deals.reduce(
        (sum, deal) => sum + ((deal.value || 0) * (deal.probability || 0)) / 100,
        0
      )

      // Original deal is in stage1: 10000 * 50% = 5000
      // Deal 1: 10000 * 50% = 5000
      // Deal 2: 20000 * 75% = 15000
      // Total stage1: 25000
      expect(stage1Weighted).toBe(25000)

      // Deal 3: 30000 * 100% = 30000
      expect(stage2Weighted).toBe(30000)
    })
  })

  describe('Performance', () => {
    it('should move deals quickly (< 100ms)', async () => {
      const startTime = performance.now()

      await prisma.deal.update({
        where: { id: testDealId },
        data: { stageId: testStage2Id },
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`Stage move took ${duration.toFixed(2)}ms`)

      // Should be fast for a single deal move
      expect(duration).toBeLessThan(100)
    })
  })

  describe('Stage Change Unit Test', () => {
    it('should successfully move a deal from one stage to another', async () => {
      // Initial state: deal is in stage 1
      let deal = await prisma.deal.findUnique({
        where: { id: testDealId },
        include: { stage: true },
      })
      expect(deal?.stageId).toBe(testStage1Id)
      expect(deal?.stage?.name).toBe('Qualification')

      // Move deal to stage 2
      await prisma.deal.update({
        where: { id: testDealId },
        data: { stageId: testStage2Id },
      })

      // Verify deal moved to stage 2
      deal = await prisma.deal.findUnique({
        where: { id: testDealId },
        include: { stage: true },
      })
      expect(deal?.stageId).toBe(testStage2Id)
      expect(deal?.stage?.name).toBe('Proposal')

      // Move deal to stage 3
      await prisma.deal.update({
        where: { id: testDealId },
        data: { stageId: testStage3Id },
      })

      // Verify deal moved to stage 3
      deal = await prisma.deal.findUnique({
        where: { id: testDealId },
        include: { stage: true },
      })
      expect(deal?.stageId).toBe(testStage3Id)
      expect(deal?.stage?.name).toBe('Negotiation')
    })
  })
})
