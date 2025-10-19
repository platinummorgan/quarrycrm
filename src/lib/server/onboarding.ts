import { prisma } from '@/lib/prisma'

export async function getOnboardingStatus(membershipId: string) {
  try {
    // Try the full select (works if columns exist)
    return await (prisma.orgMember as any).findUnique({
      where: { id: membershipId },
      select: {
        onboardingDismissed: true,
        onboardingProgress: true,
        organizationId: true,
      },
    })
  } catch (err) {
    // Fallback if columns don't exist in this env
    console.error('getOnboardingStatus: full select failed, falling back', err)
    const minimal = await (prisma.orgMember as any).findUnique({
      where: { id: membershipId },
      select: { organizationId: true },
    })
    // Default to “skip onboarding” so the app renders instead of 500-ing
    return {
      organizationId: minimal?.organizationId ?? null,
      onboardingDismissed: true,
      onboardingProgress: {},
    }
  }
}
