import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ensureOrgForUser } from '@/lib/org/ensure'

export async function getServerAuthSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getServerAuthSession()

  if (!session?.user) {
    redirect('/auth/signin')
  }

  return session
}

export async function requireOrg() {
  const session = await requireAuth()

  // If the session already includes currentOrg info, use it
  if (session.user.currentOrg?.id) {
    return {
      session,
      userId: session.user.id,
      orgId: session.user.currentOrg.id,
      orgRole: session.user.currentOrg.role,
    }
  }

  // Otherwise, try to find a membership quickly
  try {
    const membership = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    })

    if (membership?.organizationId) {
      return {
        session,
        userId: session.user.id,
        orgId: membership.organizationId,
        orgRole: membership.role,
      }
    }
  } catch (e) {
    // ignore and fallthrough to auto-provision
  }

  // Auto-provision a personal org for first-time users
  const created = await ensureOrgForUser(prisma, { id: session.user.id, email: session.user.email || null })

  return {
    session,
    userId: session.user.id,
    orgId: created.id,
    orgRole: 'OWNER',
  }
}

export function assertRole(requiredRole: 'OWNER' | 'ADMIN' | 'MEMBER') {
  return async function () {
    const { orgRole } = await requireOrg()

    const roleHierarchy = { OWNER: 3, ADMIN: 2, MEMBER: 1 }
    const userRoleLevel =
      roleHierarchy[orgRole as keyof typeof roleHierarchy] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    if (userRoleLevel < requiredRoleLevel) {
      throw new Error(
        `Insufficient permissions. Required: ${requiredRole}, Current: ${orgRole}`
      )
    }

    return { orgRole }
  }
}

// Helper to check if user has access to a specific organization
export async function validateOrgAccess(orgId: string) {
  const session = await requireAuth()

  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId: session.user.id,
      },
    },
  })

  if (!membership) {
    throw new Error('Access denied: User is not a member of this organization')
  }

  return {
    session,
    userId: session.user.id,
    orgId,
    orgRole: membership.role,
  }
}

// Helper to get the current organization member
export async function getCurrentMember() {
  const { session, orgId, userId } = await requireOrg()

  const member = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId: userId,
      },
    },
  })

  if (!member) {
    throw new Error('Member not found')
  }

  return member
}
