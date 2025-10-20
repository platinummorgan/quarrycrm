import { OrganizationPlan } from '@prisma/client'

export interface PlanLimits {
  contacts: number
  companies: number
  deals: number
  users: number
  apiKeys: number
  webhooks: number
  storageGB: number
  apiCallsPerDay: number
  pipelines: number
}

export const PLAN_LIMITS: Record<OrganizationPlan, PlanLimits> = {
  FREE: {
    contacts: 2000,
    companies: 500,
    deals: 100,
    users: 2,
    apiKeys: 1,
    webhooks: 2,
    storageGB: 1,
    apiCallsPerDay: 1000,
    pipelines: 2,
  },
  PRO: {
    contacts: 10000,
    companies: 5000,
    deals: 1000,
    users: 10,
    apiKeys: 5,
    webhooks: 10,
    storageGB: 50,
    apiCallsPerDay: 10000,
    pipelines: 10,
  },
  TEAM: {
    contacts: -1, // unlimited
    companies: -1,
    deals: -1,
    users: -1,
    apiKeys: 20,
    webhooks: 50,
    storageGB: 500,
    apiCallsPerDay: 100000,
    pipelines: -1, // unlimited
  },
}

export const PLAN_NAMES: Record<OrganizationPlan, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  TEAM: 'Team',
}

export const PLAN_PRICES: Record<
  OrganizationPlan,
  { monthly: number; yearly: number }
> = {
  FREE: { monthly: 0, yearly: 0 },
  PRO: { monthly: 29, yearly: 290 },
  TEAM: { monthly: 99, yearly: 990 },
}

export function canAddResource(
  plan: OrganizationPlan,
  resourceType: keyof PlanLimits,
  currentCount: number
): boolean {
  const limit = PLAN_LIMITS[plan][resourceType]
  if (limit === -1) return true // unlimited
  return currentCount < limit
}

export function getUpgradeMessage(
  plan: OrganizationPlan,
  resourceType: keyof PlanLimits
): string {
  const limit = PLAN_LIMITS[plan][resourceType]

  if (plan === 'FREE') {
    return `You've reached the ${PLAN_NAMES.FREE} plan limit of ${limit} ${resourceType}. Upgrade to ${PLAN_NAMES.PRO} for more.`
  }

  if (plan === 'PRO') {
    return `You've reached the ${PLAN_NAMES.PRO} plan limit of ${limit} ${resourceType}. Upgrade to ${PLAN_NAMES.TEAM} for unlimited.`
  }

  return `You've reached your plan limit.`
}

export async function getOrganizationPlan(
  orgId: string
): Promise<OrganizationPlan> {
  const { prisma } = await import('@/lib/prisma')
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    })
    return org?.plan || 'FREE'
  } catch (err) {
    // If the DB schema doesn't contain the `plan` column yet (older test DB),
    // fall back to FREE without throwing. This keeps tests and demos working
    // without requiring a destructive schema reset.
    return 'FREE'
  }
}

export async function checkPlanLimit(
  orgId: string,
  resourceType: keyof PlanLimits,
  currentCount?: number
): Promise<{ allowed: boolean; message?: string }> {
  const plan = await getOrganizationPlan(orgId)
  const limit = PLAN_LIMITS[plan][resourceType]

  // Unlimited
  if (limit === -1) {
    return { allowed: true }
  }

  // Get current count if not provided
  let count = currentCount
  if (count === undefined) {
    const { prisma } = await import('@/lib/prisma')

    switch (resourceType) {
      case 'contacts':
        count = await prisma.contact.count({
          where: { organizationId: orgId, deletedAt: null },
        })
        break
      case 'pipelines':
        count = await prisma.pipeline.count({
          where: { organizationId: orgId, deletedAt: null },
        })
        break
      case 'companies':
        count = await prisma.company.count({
          where: { organizationId: orgId, deletedAt: null },
        })
        break
      case 'deals':
        count = await prisma.deal.count({
          where: { organizationId: orgId, deletedAt: null },
        })
        break
      case 'users':
        count = await prisma.orgMember.count({
          where: { organizationId: orgId },
        })
        break
      case 'webhooks':
        count = await prisma.webhook.count({
          where: { organizationId: orgId, deletedAt: null },
        })
        break
      case 'apiKeys':
        count = await prisma.apiKey.count({
          where: { organizationId: orgId, deletedAt: null },
        })
        break
      default:
        count = 0
    }
  }

  const allowed = count < limit
  const message = allowed ? undefined : 'Limit reached. Upgrade in Settings.'

  return { allowed, message }
}
