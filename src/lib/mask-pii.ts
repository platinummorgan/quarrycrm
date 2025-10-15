/**
 * Masks personally identifiable information (PII) for demo users
 * Replaces sensitive data with asterisks while preserving format
 */

export function maskPII(value: string | null | undefined): string {
  if (!value) return ''

  // Email masking: show first 2 chars, then ***@domain
  if (value.includes('@')) {
    const parts = value.split('@')
    const local = parts[0]
    const domain = parts.slice(1).join('@') // Handle multiple @ symbols

    if (local.length <= 2) {
      return `${local}***@${domain}`
    }
    return `${local.slice(0, 2)}***@${domain}`
  }

  // Phone masking: show last 4 digits, mask the rest
  if (/^\+?[\d\s\-\(\)]+$/.test(value.replace(/\s/g, ''))) {
    const digitsOnly = value.replace(/\D/g, '')
    if (digitsOnly.length <= 4) {
      return '*'.repeat(digitsOnly.length)
    }
    const lastFour = digitsOnly.slice(-4)
    const maskedLength = digitsOnly.length - 4
    return '*'.repeat(maskedLength) + lastFour
  }

  // Default: mask all but first and last character, or mask all if single char
  if (value.length === 1) {
    return '*'
  }
  if (value.length === 2) {
    return value
  }

  return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1]
}