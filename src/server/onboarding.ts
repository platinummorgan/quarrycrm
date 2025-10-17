'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentMember } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import type { OnboardingProgress, OnboardingState } from '@/lib/onboarding'
import { calculateOnboardingState } from '@/lib/onboarding'

/**
 * Get the current user's onboarding state
 */
export async function getOnboardingState(): Promise<OnboardingState | null> {
  try {
    const member = await getCurrentMember()
    if (!member) return null

    const orgMember = await prisma.orgMember.findUnique({
      where: {
        id: member.id,
      },
      select: {
        onboardingDismissed: true,
        onboardingCompleted: true,
        onboardingProgress: true,
      },
    })

    if (!orgMember) return null

    return calculateOnboardingState(
      orgMember.onboardingDismissed,
      orgMember.onboardingProgress as Partial<OnboardingProgress> | null
    )
  } catch (error) {
    console.error('Failed to get onboarding state:', error)
    return null
  }
}

/**
 * Check and update onboarding progress based on actual data
 */
export async function checkOnboardingProgress(): Promise<OnboardingState | null> {
  try {
    const member = await getCurrentMember()
    if (!member) return null

    const orgMember = await prisma.orgMember.findUnique({
      where: { id: member.id },
      select: {
        onboardingDismissed: true,
        onboardingProgress: true,
        organizationId: true,
      },
    })

    if (!orgMember) return null

    // Check actual completion status
    const [pipelineCount, contactCount, dealCount, viewCount] = await Promise.all([
      prisma.pipeline.count({
        where: { organizationId: orgMember.organizationId },
      }),
      prisma.contact.count({
        where: { organizationId: orgMember.organizationId },
      }),
      prisma.deal.count({
        where: { organizationId: orgMember.organizationId },
      }),
      prisma.savedView.count({
        where: { organizationId: orgMember.organizationId },
      }),
    ])

    const currentProgress = orgMember.onboardingProgress as Partial<OnboardingProgress> | null

    const progress: OnboardingProgress = {
      create_pipeline: pipelineCount > 0,
      import_csv: contactCount >= 10, // Assume CSV imported if 10+ contacts
      create_deal: dealCount > 0,
      save_view: viewCount > 0,
      install_pwa: currentProgress?.install_pwa || false, // Can only be set manually
    }

    // Update if changed
    const hasChanged = JSON.stringify(currentProgress) !== JSON.stringify(progress)
    if (hasChanged) {
      await prisma.orgMember.update({
        where: { id: member.id },
        data: {
            onboardingProgress: (progress as unknown) as any,
            onboardingCompleted: Object.values(progress).every(Boolean),
          },
      })
    }

    return calculateOnboardingState(orgMember.onboardingDismissed, progress)
  } catch (error) {
    console.error('Failed to check onboarding progress:', error)
    return null
  }
}

/**
 * Mark onboarding as dismissed
 */
export async function dismissOnboarding(): Promise<{ success: boolean }> {
  try {
    const member = await getCurrentMember()
    if (!member) {
      return { success: false }
    }

    await prisma.orgMember.update({
      where: { id: member.id },
      data: { onboardingDismissed: true },
    })

    revalidatePath('/app')
    return { success: true }
  } catch (error) {
    console.error('Failed to dismiss onboarding:', error)
    return { success: false }
  }
}

/**
 * Mark a specific task as complete
 */
export async function completeOnboardingTask(
  taskId: keyof OnboardingProgress
): Promise<{ success: boolean }> {
  try {
    const member = await getCurrentMember()
    if (!member) {
      return { success: false }
    }

    const orgMember = await prisma.orgMember.findUnique({
      where: { id: member.id },
      select: { onboardingProgress: true },
    })

    const currentProgress = (orgMember?.onboardingProgress as Partial<OnboardingProgress>) || {}

    const updatedProgress: OnboardingProgress = {
      create_pipeline: false,
      import_csv: false,
      create_deal: false,
      save_view: false,
      install_pwa: false,
      ...currentProgress,
      [taskId]: true,
    }

    await prisma.orgMember.update({
      where: { id: member.id },
      data: {
        onboardingProgress: (updatedProgress as unknown) as any,
        onboardingCompleted: Object.values(updatedProgress).every(Boolean),
      },
    })

    revalidatePath('/app')
    return { success: true }
  } catch (error) {
    console.error('Failed to complete onboarding task:', error)
    return { success: false }
  }
}
