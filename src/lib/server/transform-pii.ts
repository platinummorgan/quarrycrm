/**
 * Server-side PII Transformers
 * 
 * These utilities automatically mask PII in server responses
 * when serving data to demo users or demo organizations.
 */

import type { Session } from 'next-auth'
import {
  maskEmail,
  maskPhone,
  maskPIIFields,
  maskPIIArray,
  isRequestFromDemo,
  maskContactData,
  maskCompanyData,
} from '../mask-pii'

/**
 * Contact type with PII fields
 */
export interface ContactWithPII {
  id: string
  email?: string | null
  phone?: string | null
  [key: string]: any
}

/**
 * Company type with PII fields
 */
export interface CompanyWithPII {
  id: string
  email?: string | null
  phone?: string | null
  website?: string | null
  [key: string]: any
}

/**
 * Transform contact data for demo users
 * Masks email and phone fields
 */
export function transformContact<T extends ContactWithPII>(
  contact: T,
  session: Session | null
): T {
  const isDemo = isRequestFromDemo(session)
  return maskContactData(contact, isDemo)
}

/**
 * Transform array of contacts for demo users
 */
export function transformContacts<T extends ContactWithPII>(
  contacts: T[],
  session: Session | null
): T[] {
  const isDemo = isRequestFromDemo(session)
  if (!isDemo) return contacts
  
  return contacts.map(contact => maskContactData(contact, isDemo))
}

/**
 * Transform company data for demo users
 * Masks email, phone, and website fields
 */
export function transformCompany<T extends CompanyWithPII>(
  company: T,
  session: Session | null
): T {
  const isDemo = isRequestFromDemo(session)
  return maskCompanyData(company, isDemo)
}

/**
 * Transform array of companies for demo users
 */
export function transformCompanies<T extends CompanyWithPII>(
  companies: T[],
  session: Session | null
): T[] {
  const isDemo = isRequestFromDemo(session)
  if (!isDemo) return companies
  
  return companies.map(company => maskCompanyData(company, isDemo))
}

/**
 * Transform activity data for demo users
 * Masks any email or phone references in activities
 */
export function transformActivity<T extends Record<string, any>>(
  activity: T,
  session: Session | null
): T {
  const isDemo = isRequestFromDemo(session)
  return maskPIIFields(activity, isDemo, ['email', 'phone', 'contactEmail', 'contactPhone'])
}

/**
 * Transform array of activities for demo users
 */
export function transformActivities<T extends Record<string, any>>(
  activities: T[],
  session: Session | null
): T[] {
  const isDemo = isRequestFromDemo(session)
  return maskPIIArray(activities, isDemo, ['email', 'phone', 'contactEmail', 'contactPhone'])
}

/**
 * Transform deal data for demo users
 * Handles nested contact and company data
 */
export function transformDeal<T extends {
  contact?: ContactWithPII | null
  company?: CompanyWithPII | null
  [key: string]: any
}>(
  deal: T,
  session: Session | null
): T {
  const isDemo = isRequestFromDemo(session)
  if (!isDemo) return deal
  
  const transformed = { ...deal }
  
  if (transformed.contact) {
    transformed.contact = maskContactData(transformed.contact, isDemo)
  }
  
  if (transformed.company) {
    transformed.company = maskCompanyData(transformed.company, isDemo)
  }
  
  return transformed
}

/**
 * Transform array of deals for demo users
 */
export function transformDeals<T extends {
  contact?: ContactWithPII | null
  company?: CompanyWithPII | null
  [key: string]: any
}>(
  deals: T[],
  session: Session | null
): T[] {
  const isDemo = isRequestFromDemo(session)
  if (!isDemo) return deals
  
  return deals.map(deal => transformDeal(deal, session))
}

/**
 * Generic transformer for any data structure
 * Recursively masks PII in nested objects and arrays
 */
export function transformData<T>(
  data: T,
  session: Session | null,
  fields: string[] = ['email', 'phone']
): T {
  const isDemo = isRequestFromDemo(session)
  if (!isDemo) return data
  
  if (Array.isArray(data)) {
    return data.map(item => transformData(item, session, fields)) as any
  }
  
  if (data && typeof data === 'object') {
    return maskPIIFields(data as any, isDemo, fields) as T
  }
  
  return data
}

/**
 * Middleware-style transformer for tRPC procedures
 * Usage: return transformResponse(result, ctx.session)
 */
export function transformResponse<T>(
  data: T,
  session: Session | null,
  options?: {
    fields?: string[]
    deep?: boolean
  }
): T {
  const isDemo = isRequestFromDemo(session)
  if (!isDemo) return data
  
  const fields = options?.fields || ['email', 'phone', 'contactEmail', 'contactPhone']
  
  if (options?.deep) {
    return transformData(data, session, fields)
  }
  
  if (Array.isArray(data)) {
    return maskPIIArray(data as any, isDemo, fields) as any
  }
  
  if (data && typeof data === 'object') {
    return maskPIIFields(data as any, isDemo, fields) as T
  }
  
  return data
}

/**
 * Check if organization is demo organization
 * @param orgId - Organization ID to check
 */
export function isDemoOrganization(orgId: string | undefined | null): boolean {
  if (!orgId) return false
  
  // Check against environment variable if set
  const demoOrgId = process.env.DEMO_ORG_ID
  if (demoOrgId && orgId === demoOrgId) return true
  
  // For now, we check by org name at runtime
  // This is handled by the session isDemo flag
  return false
}

/**
 * Get masking status for logging/debugging
 */
export function getMaskingStatus(session: Session | null): {
  isDemo: boolean
  reason: string | null
} {
  if (!session?.user) {
    return { isDemo: false, reason: null }
  }
  
  if (session.user.isDemo === true) {
    return { isDemo: true, reason: 'user.isDemo flag' }
  }
  
  if (session.user.currentOrg?.role === 'DEMO') {
    return { isDemo: true, reason: 'currentOrg.role === DEMO' }
  }
  
  // Check for demoOrgId (may be present in extended session)
  const extendedUser = session.user as any
  if (extendedUser.demoOrgId) {
    return { isDemo: true, reason: 'demoOrgId present' }
  }
  
  return { isDemo: false, reason: null }
}
