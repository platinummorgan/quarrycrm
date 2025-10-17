import { PrismaClient } from '@prisma/client'

/**
 * Lazy-loaded Prisma client to avoid connecting at import time.
 * In tests, the client parameter should be passed from the test setup.
 */
let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

/**
 * Seed organization, user, and membership.
 * Returns full objects (not just IDs) for easy access in tests.
 */
export async function seedOrgUser(client?: PrismaClient) {
  const db = client ?? getPrismaClient()
  const org = await db.organization.create({
    data: {
      name: 'Seeded Org',
      domain: `seeded-${Date.now()}.local`,
    },
  })

  const user = await db.user.create({
    data: {
      email: `seeded-${Date.now()}@example.com`,
      name: 'Seeded User',
    },
  })

  const membership = await db.orgMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
    },
  })

  return { org, user, membership }
}

/**
 * Seed a minimal pipeline with 3 stages.
 * Uses names/colors that match test assertions.
 */
export async function seedPipelines(orgId: string, ownerMemberId: string, client?: PrismaClient) {
  const db = client ?? getPrismaClient()
  const pipeline = await db.pipeline.create({
    data: {
      name: 'Seeded Pipeline',
      organizationId: orgId,
      ownerId: ownerMemberId,
    },
  })

  // Create three pipeline stages. Tests expect the middle stage to be
  // the 'Proposal' stage with color '#eab308'. Use stable names/colors
  // so assertions in tests pass.
  const stages = await Promise.all([
    db.stage.create({ data: { name: 'Lead', pipelineId: pipeline.id, order: 0, color: '#3B82F6' } }),
    db.stage.create({ data: { name: 'Proposal', pipelineId: pipeline.id, order: 1, color: '#eab308' } }),
    db.stage.create({ data: { name: 'Negotiation', pipelineId: pipeline.id, order: 2, color: '#EF4444' } }),
  ])

  return {
    pipeline,
    stages,
  }
}

/**
 * Seed bulk contacts for performance testing.
 * @param orgId - Organization ID
 * @param ownerId - Owner member ID
 * @param count - Number of contacts to create
 * @param options - Optional overrides (e.g., specific companyId)
 */
export async function seedContacts(
  orgId: string,
  ownerId: string,
  count: number,
  options?: { companyId?: string; client?: PrismaClient }
) {
  const db = options?.client ?? getPrismaClient()

  const contacts = []
  for (let i = 0; i < count; i++) {
    const contact = await db.contact.create({
      data: {
        organizationId: orgId,
        firstName: `First${i}`,
        lastName: `Last${i}`,
        email: `contact${i}-${Date.now()}@test.com`,
        ownerId,
        ...(options?.companyId && { companyId: options.companyId }),
      },
    })
    contacts.push(contact)
  }

  return contacts
}

export default { seedOrgUser, seedPipelines, seedContacts }
