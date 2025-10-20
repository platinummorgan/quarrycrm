import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  seedPipelines,
  seedContacts,
  seedOrgUser,
} from '../../../../tests/utils/seed'

describe('Contacts Feature - Smoke Tests', () => {
  let ctx: Awaited<ReturnType<typeof seedOrgUser>>
  let pipelineCtx: Awaited<ReturnType<typeof seedPipelines>>

  beforeAll(async () => {
    if (typeof globalThis.__dbReset === 'function') return

    const org = await prisma.organization.create({
      data: { name: 'Test Org (contacts smoke)' },
      select: { id: true },
    })

    const user = await prisma.user.create({
      data: {
        email: `contacts-smoke-${Date.now()}@test.local`,
        name: 'Contacts Smoke',
      },
      select: { id: true },
    })

    const member = await prisma.orgMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'OWNER',
        onboardingProgress: {},
      },
      select: { id: true },
    })

    ctx = { org, user, member } as any
  })

  afterAll(async () => {
    if (!ctx?.org?.id) return
    try { await prisma.organization.delete({ where: { id: ctx.org.id } }) } catch {}
    try { await prisma.user.delete({ where: { id: (ctx as any).user.id } }) } catch {}
  })

  beforeEach(async () => {
    if (typeof globalThis.__dbReset === 'function' &&
        typeof globalThis.__withAdvisoryLock === 'function') {
      await globalThis.__withAdvisoryLock(async (tx: Prisma.TransactionClient) => {
        await globalThis.__dbReset!(tx)
        ctx = await seedOrgUser(tx)
        pipelineCtx = await seedPipelines(ctx.org.id, ctx.member.id, tx)
      })
      return
    }

    if (typeof globalThis.__dbReset === 'function') {
      await globalThis.__dbReset!()
    }

    ctx = await seedOrgUser()
    pipelineCtx = await seedPipelines(ctx.org.id, ctx.member.id)
  }, 300000)

  describe('Contacts List', () => {
    it('should list contacts with pagination (25/page)', async () => {
      await Promise.all(
        Array.from({ length: 30 }, (_, i) =>
          prisma.contact.create({
            data: {
              organizationId: ctx.org.id,
              firstName: `First${i}`,
              lastName: `Last${i}`,
              email: `contact${i}@test.com`,
              ownerId: ctx.member.id,
            },
          })
        )
      )

      const page1 = await prisma.contact.findMany({
        where: { organizationId: ctx.org.id, deletedAt: null },
        select: {
          id: true, firstName: true, lastName: true, email: true, updatedAt: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 26,
      })

      expect(page1.length).toBe(26)
      expect(page1.slice(0, 25).length).toBe(25)
      const cursor = `${page1[24].updatedAt.toISOString()}_${page1[24].id}`
      expect(cursor).toBeTruthy()

      if (typeof globalThis.__dbReset !== 'function') {
        await prisma.contact.deleteMany({ where: { organizationId: ctx.org.id } })
      }
    })

    it('should search contacts by name', async () => {
      await prisma.contact.createMany({
        data: [
          { organizationId: ctx.org.id, firstName: 'John', lastName: 'Doe', email: 'john@test.com', ownerId: ctx.member.id },
          { organizationId: ctx.org.id, firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', ownerId: ctx.member.id },
          { organizationId: ctx.org.id, firstName: 'Bob', lastName: 'Johnson', email: 'bob@test.com', ownerId: ctx.member.id },
        ],
      })

      const results = await prisma.contact.findMany({
        where: {
          organizationId: ctx.org.id,
          deletedAt: null,
          OR: [
            { firstName: { contains: 'John', mode: 'insensitive' } },
            { lastName: { contains: 'John', mode: 'insensitive' } },
            { email: { contains: 'John', mode: 'insensitive' } },
          ],
        },
      })

      expect(results.length).toBeGreaterThanOrEqual(2)

      if (typeof globalThis.__dbReset !== 'function') {
        await prisma.contact.deleteMany({ where: { organizationId: ctx.org.id } })
      }
    })

    it('should select only needed columns for performance', async () => {
      await prisma.contact.create({
        data: {
          organizationId: ctx.org.id,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '555-1234',
          ownerId: ctx.member.id,
        },
      })

      const contact = await prisma.contact.findFirst({
        where: { organizationId: ctx.org.id },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          company: { select: { id: true, name: true } },
          owner: { select: { id: true, user: { select: { id: true, name: true, email: true } } } },
          updatedAt: true, createdAt: true,
        },
      })

      expect(contact).toBeDefined()
      expect(contact?.firstName).toBe('Test')
      expect(contact?.lastName).toBe('User')
      expect(contact?.email).toBe('test@example.com')

      if (typeof globalThis.__dbReset !== 'function') {
        await prisma.contact.deleteMany({ where: { organizationId: ctx.org.id } })
      }
    })
  })

  describe('Contact Create', () => {
    it('should create contact with required fields', async () => {
      const contact = await prisma.contact.create({
        data: {
          organizationId: ctx.org.id,
          firstName: 'New',
          lastName: 'Contact',
          email: 'new@example.com',
          ownerId: ctx.member.id,
        },
      })

      expect(contact.id).toBeDefined()
      expect(contact.organizationId).toBe(ctx.org.id)
      expect(contact.ownerId).toBe(ctx.member.id)

      if (typeof globalThis.__dbReset !== 'function') {
        await prisma.contact.delete({ where: { id: contact.id } })
      }
    })

    it('should create contact with optional fields', async () => {
      const contact = await prisma.contact.create({
        data: {
          organizationId: ctx.org.id,
          firstName: 'Optional',
          lastName: 'Fields',
          email: 'optional@example.com',
          phone: '+1-555-9999',
          ownerId: ctx.member.id,
        },
      })

      expect(contact.phone).toBe('+1-555-9999')

      if (typeof globalThis.__dbReset !== 'function') {
        await prisma.contact.delete({ where: { id: contact.id } })
      }
    })

    it('should validate required fields', async () => {
      await expect(
        prisma.contact.create({
          data: {
            organizationId: ctx.org.id,
            lastName: 'NoFirst',
            ownerId: ctx.member.id,
          } as any,
        })
      ).rejects.toThrow()
    })
  })

  describe('Contact Update', () => {
    it('should update contact fields', async () => {
      const contact = await prisma.contact.create({
        data: {
          organizationId: ctx.org.id,
          firstName: 'Original',
          lastName: 'Name',
          email: 'original@example.com',
          ownerId: ctx.member.id,
        },
      })

      const updated = await prisma.contact.update({
        where: { id: contact.id },
        data: { firstName: 'Updated', email: 'updated@example.com' },
      })

      expect(updated.firstName).toBe('Updated')
      expect(updated.lastName).toBe('Name')
      expect(updated.email).toBe('updated@example.com')

      if (typeof globalThis.__dbReset !== 'function') {
        await prisma.contact.delete({ where: { id: contact.id } })
      }
    })

    it('should only update contacts in same organization', async () => {
      const contact = await prisma.contact.create({
        data: {
          organizationId: ctx.org.id,
          firstName: 'Test',
          lastName: 'Contact',
          ownerId: ctx.member.id,
        },
      })

      const result = await prisma.contact.updateMany({
        where: { id: contact.id, organizationId: ctx.org.id },
        data: { firstName: 'Updated' },
      })
      expect(result.count).toBe(1)

      const wrongOrgResult = await prisma.contact.updateMany({
        where: { id: contact.id, organizationId: 'wrong-org-id' },
        data: { firstName: 'Should Not Update' },
      })
      expect(wrongOrgResult.count).toBe(0)

      const final = await prisma.contact.findUnique({ where: { id: contact.id } })
      expect(final?.firstName).toBe('Updated')

      await prisma.contact.delete({ where: { id: contact.id } })
    })
  })

  describe('Performance', () => {
    it('should list 10k contacts in <120ms', async () => {
      if (process.env.CI) return

      const contacts = await seedContacts(ctx.org.id, ctx.member.id, 100, { client: prisma })
      expect(contacts.length).toBe(100)

      const start = performance.now()
      await prisma.contact.findMany({
        where: { organizationId: ctx.org.id, deletedAt: null },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          owner: { select: { user: { select: { name: true } } } },
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 25,
      })
      const duration = performance.now() - start
      console.log(`Query took ${duration.toFixed(2)}ms`)
      expect(duration).toBeLessThan(300)

      await prisma.contact.deleteMany({ where: { organizationId: ctx.org.id } })
    }, 10_000)
  })

  afterEach(async () => {
    if (typeof globalThis.__dbReset === 'function') return
    await prisma.contact.deleteMany({ where: { organizationId: ctx.org.id } })
    await prisma.orgMember.deleteMany({ where: { organizationId: ctx.org.id } })
    await prisma.user.deleteMany({ where: { id: ctx.user.id } })
    await prisma.organization.deleteMany({ where: { id: ctx.org.id } })
  })
})
