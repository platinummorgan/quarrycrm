import type { PrismaClient } from '@prisma/client'

export async function ensureOrgForUser(prisma: PrismaClient, user: { id: string; email?: string | null }) {
  // 1) If user already has a membership, return its organization
  const existing = await prisma.orgMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  })

  if (existing?.organization) return existing.organization

  // 2) Create a personal organization and owner membership
  const orgName = user.email ? `${user.email.split('@')[0]}'s org` : 'Personal Workspace'

  const org = await prisma.organization.create({
    data: {
      name: orgName,
    },
  })

  await prisma.orgMember.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
      onboardingProgress: {},
    },
  })

  return org
}

export default ensureOrgForUser
