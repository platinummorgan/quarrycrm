import { prisma } from '@/lib/prisma'

export async function ensureUserOrg(userId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // Already has a membership? use it.
    const m = await tx.orgMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    })
    if (m?.organizationId) return m.organizationId

    // Create a default org + membership
    const org = await tx.organization.create({
      data: { name: 'My Workspace', /* domain: null, */ },
      select: { id: true },
    })

    await tx.orgMember.create({
      data: { userId, organizationId: org.id, role: 'OWNER', onboardingProgress: {} },
    })

    // If your User has currentOrganizationId, set it (ignore if column doesn’t exist)
    try {
      // Attempt a raw SQL update for `current_organization_id` (snake_case) or
      // `currentOrganizationId` depending on schema naming. If the column
      // doesn't exist this will throw and we intentionally ignore it.
      await tx.$executeRawUnsafe(`UPDATE users SET current_organization_id = $1 WHERE id = $2`, org.id, userId)
    } catch {
      try {
        await tx.$executeRawUnsafe(`UPDATE users SET \"currentOrganizationId\" = $1 WHERE id = $2`, org.id, userId)
      } catch {
        // ignore if neither column exists
      }
    }

    return org.id
  })
}
