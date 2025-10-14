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
}

export const PLAN_LIMITS: Record<OrganizationPlan, PlanLimits> = {
  FREE: {
    contacts: 100,
    companies: 50,
    deals: 25,
    users: 2,
    apiKeys: 1,
    webhooks: 2,
    storageGB: 1,
    apiCallsPerDay: 1000,
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
  },
}

export const PLAN_NAMES: Record<OrganizationPlan, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  TEAM: 'Team',
}

export const PLAN_PRICES: Record<OrganizationPlan, { monthly: number; yearly: number }> = {
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
