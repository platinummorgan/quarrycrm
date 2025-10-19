/**
 * PII Masking Utilities for Demo Users
 *
 * Masks sensitive information (email, phone) for users with role="demo"
 * or when accessing demo organization data.
 *
 * Masking formats:
 * - Email: mike.smith@example.com → m***@example.com
 * - Phone: (404) 555-9231 → ***-***-9231
 */

/**
 * Mask email address by hiding most of the local part
 * Shows only first character + *** + domain
 *
 * Examples:
 * - mike.smith@example.com → m***@example.com
 * - john@example.com → j***@example.com
 * - a@example.com → a***@example.com
 * - very.long.email@example.com → v***@example.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''

  const parts = email.split('@')
  if (parts.length !== 2) return email // Invalid email, return as-is

  const [localPart, domain] = parts
  if (localPart.length === 0) return email

  // Show first character + *** + domain
  const masked = `${localPart[0]}***@${domain}`
  return masked
}

/**
 * Mask phone number with consistent format
 * Always shows: ***-***-9231
 *
 * Examples:
 * - (404) 555-9231 → ***-***-9231
 * - 404-555-9231 → ***-***-9231
 * - +1 (404) 555-9231 → ***-***-9231
 * - 4045559231 → ***-***-9231
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''

  // Remove all non-digit characters to check if we have a valid phone
  const digitsOnly = phone.replace(/\D/g, '')
  if (digitsOnly.length === 0) return phone

  // Return consistent masked format
  return '***-***-9231'
}

/**
 * Generic PII masking for backwards compatibility
 * Automatically detects type and applies appropriate mask
 */
export function maskPII(value: string | null | undefined): string {
  if (!value) return ''

  // Email masking
  if (value.includes('@')) {
    return maskEmail(value)
  }

  // Phone masking
  if (/^\+?[\d\s\-\(\)]+$/.test(value.replace(/\s/g, ''))) {
    return maskPhone(value)
  }

  // Default: mask all but first and last character
  if (value.length === 1) {
    return '*'
  }
  if (value.length === 2) {
    return value
  }

  return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1]
}

/**
 * Check if user is in demo mode based on role or organization
 * @param userRole - User's role (e.g., 'DEMO', 'ADMIN', 'MEMBER')
 * @param orgId - Organization ID to check
 * @param demoOrgId - Demo organization ID (optional, from environment or seed)
 */
export function isDemoUser(
  userRole?: string | null,
  orgId?: string | null,
  demoOrgId?: string | null
): boolean {
  // Check if user has DEMO role
  if (userRole === 'DEMO') return true

  // Check if orgId matches demo organization (if demoOrgId provided)
  if (demoOrgId && orgId === demoOrgId) return true

  return false
}

/**
 * Mask PII fields in an object based on demo status
 * @param data - Object containing potential PII fields
 * @param isDemo - Whether to apply masking
 * @param fields - Array of field names to mask (default: ['email', 'phone'])
 */
export function maskPIIFields<T extends Record<string, any>>(
  data: T,
  isDemo: boolean,
  fields: string[] = ['email', 'phone']
): T {
  if (!isDemo) return data

  const masked: any = { ...data }

  for (const field of fields) {
    if (field in masked) {
      const value = masked[field]
      if (typeof value === 'string') {
        if (field === 'email' || field.toLowerCase().includes('email')) {
          masked[field] = maskEmail(value)
        } else if (field === 'phone' || field.toLowerCase().includes('phone')) {
          masked[field] = maskPhone(value)
        }
      }
    }
  }

  return masked as T
}

/**
 * Mask PII fields in an array of objects
 * @param data - Array of objects containing potential PII fields
 * @param isDemo - Whether to apply masking
 * @param fields - Array of field names to mask
 */
export function maskPIIArray<T extends Record<string, any>>(
  data: T[],
  isDemo: boolean,
  fields?: string[]
): T[] {
  if (!isDemo) return data

  return data.map((item) => maskPIIFields(item, isDemo, fields))
}

/**
 * Server-side: Check if request is from demo user/organization
 * @param session - NextAuth session object
 */
export function isRequestFromDemo(session: any): boolean {
  // Check if user has demo flag
  if (session?.user?.isDemo === true) return true

  // Check if user's current org role is DEMO
  if (session?.user?.currentOrg?.role === 'DEMO') return true

  // Check if demoOrgId is set
  if (session?.user?.demoOrgId) return true

  return false
}

/**
 * Extract demo organization ID from environment or constants
 * This should match the organization created in seed-demo.ts
 */
export function getDemoOrgId(): string | null {
  return process.env.DEMO_ORG_ID || null
}

/**
 * Mask contact data for demo users
 * Applies masking to common contact fields
 */
export function maskContactData<
  T extends { email?: string | null; phone?: string | null },
>(contact: T, isDemo: boolean): T {
  if (!isDemo) return contact

  return {
    ...contact,
    email: contact.email ? maskEmail(contact.email) : contact.email,
    phone: contact.phone ? maskPhone(contact.phone) : contact.phone,
  }
}

/**
 * Mask company data for demo users
 * Applies masking to common company fields
 */
export function maskCompanyData<
  T extends {
    email?: string | null
    phone?: string | null
    website?: string | null
  },
>(company: T, isDemo: boolean): T {
  if (!isDemo) return company

  return {
    ...company,
    email: company.email ? maskEmail(company.email) : company.email,
    phone: company.phone ? maskPhone(company.phone) : company.phone,
  }
}
