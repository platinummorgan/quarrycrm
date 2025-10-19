import { prisma } from '@/lib/prisma'

/**
 * Soft delete a workspace (organization)
 */
export async function softDeleteWorkspace(params: {
  organizationId: string
  deletedBy: string
}) {
  const { organizationId, deletedBy } = params

  const purgeDate = new Date()
  purgeDate.setDate(purgeDate.getDate() + 30) // 30 days retention

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      deletedAt: new Date(),
      scheduledPurgeAt: purgeDate,
      deletedBy,
    },
  })

  return { success: true, purgeDate }
}

/**
 * Restore a soft-deleted workspace
 */
export async function restoreWorkspace(organizationId: string) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      deletedAt: null,
      scheduledPurgeAt: null,
      deletedBy: null,
    },
  })

  return { success: true }
}

/**
 * Permanently delete a workspace (irreversible)
 */
export async function purgeWorkspace(params: {
  organizationId: string
  confirmationPhrase: string
}) {
  const { organizationId, confirmationPhrase } = params

  // Verify confirmation phrase
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  const expectedPhrase = `delete ${org.name}`
  if (confirmationPhrase !== expectedPhrase) {
    throw new Error('Confirmation phrase does not match')
  }

  // Delete all related data (cascade deletes should handle most of this)
  await prisma.organization.delete({
    where: { id: organizationId },
  })

  return { success: true }
}

/**
 * Get workspace delete status
 */
export async function getWorkspaceDeleteStatus(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      deletedAt: true,
      scheduledPurgeAt: true,
      deletedBy: true,
    },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  const isDeleted = !!org.deletedAt
  const daysUntilPurge = org.scheduledPurgeAt
    ? Math.ceil(
        (org.scheduledPurgeAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null

  return {
    isDeleted,
    deletedAt: org.deletedAt,
    scheduledPurgeAt: org.scheduledPurgeAt,
    deletedBy: org.deletedBy,
    daysUntilPurge,
    canRestore: isDeleted && daysUntilPurge && daysUntilPurge > 0,
  }
}
