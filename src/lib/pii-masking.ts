/**
 * PII (Personally Identifiable Information) masking utilities
 *
 * Used to mask sensitive data like emails and phone numbers
 * in demo environments or when displaying data to unauthorized users.
 */

export interface MaskOptions {
  /**
   * Character to use for masking (default: '*')
   */
  maskChar?: string

  /**
   * Number of characters to show at start (default: 2)
   */
  showStart?: number

  /**
   * Number of characters to show at end (default: varies by type)
   */
  showEnd?: number

  /**
   * Whether to preserve domain/area code structure (default: true)
   */
  preserveStructure?: boolean
}

/**
 * Mask an email address
 *
 * @param email - Email address to mask
 * @param options - Masking options
 * @returns Masked email
 *
 * @example
 * maskEmail('john.doe@example.com')
 * // Returns: 'jo******@example.com'
 *
 * maskEmail('admin@company.co.uk', { showStart: 1 })
 * // Returns: 'a****@company.co.uk'
 */
export function maskEmail(
  email: string | null | undefined,
  options: MaskOptions = {}
): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  const { maskChar = '*', showStart = 2, preserveStructure = true } = options

  // Split email into local and domain parts
  const atIndex = email.indexOf('@')
  if (atIndex === -1) {
    // Invalid email, mask entire thing
    return maskChar.repeat(Math.min(email.length, 8))
  }

  const local = email.substring(0, atIndex)
  const domain = email.substring(atIndex)

  if (!preserveStructure) {
    // Just mask the local part completely except start
    const visibleStart = local.substring(0, Math.min(showStart, local.length))
    const masked = maskChar.repeat(Math.max(6, local.length - showStart))
    return visibleStart + masked + domain
  }

  // Preserve some structure in local part
  if (local.length <= showStart + 1) {
    // Very short local part, mask minimally
    return local[0] + maskChar.repeat(Math.max(1, local.length - 1)) + domain
  }

  const visibleStart = local.substring(0, showStart)
  const masked = maskChar.repeat(local.length - showStart)
  return visibleStart + masked + domain
}

/**
 * Mask a phone number
 *
 * @param phone - Phone number to mask
 * @param options - Masking options
 * @returns Masked phone number
 *
 * @example
 * maskPhone('+1 (555) 123-4567')
 * // Returns: '+1 (***) ***-4567'
 *
 * maskPhone('555-123-4567', { showEnd: 2 })
 * // Returns: '***-***-**67'
 */
export function maskPhone(
  phone: string | null | undefined,
  options: MaskOptions = {}
): string {
  if (!phone || typeof phone !== 'string') {
    return ''
  }

  const { maskChar = '*', showEnd = 4, preserveStructure = true } = options

  if (!preserveStructure) {
    // Simple masking: show last N digits
    const digits = phone.replace(/\D/g, '')
    const visible = digits.substring(Math.max(0, digits.length - showEnd))
    const masked = maskChar.repeat(Math.max(6, digits.length - showEnd))
    return masked + visible
  }

  // Preserve structure (parentheses, dashes, spaces, +)
  let result = ''
  let digitsSeen = 0
  const digits = phone.replace(/\D/g, '')
  const totalDigits = digits.length
  const digitsToMask = totalDigits - showEnd

  for (let i = 0; i < phone.length; i++) {
    const char = phone[i]

    if (/\d/.test(char)) {
      digitsSeen++
      if (digitsSeen <= digitsToMask) {
        result += maskChar
      } else {
        result += char
      }
    } else {
      // Preserve non-digit characters (spaces, dashes, parentheses, +)
      result += char
    }
  }

  return result
}

/**
 * Mask multiple fields in an object
 *
 * @param data - Object containing PII fields
 * @param fields - Fields to mask
 * @param options - Masking options
 * @returns New object with masked fields
 *
 * @example
 * maskPII({ email: 'test@example.com', phone: '555-1234', name: 'John' }, ['email', 'phone'])
 * // Returns: { email: 'te**@example.com', phone: '***-1234', name: 'John' }
 */
export function maskPII<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[],
  options: MaskOptions = {}
): T {
  const masked = { ...data }

  for (const field of fields) {
    const value = data[field]

    if (value === null || value === undefined) {
      continue
    }

    // Determine field type and apply appropriate masking
    const fieldStr = String(field).toLowerCase()

    if (fieldStr.includes('email')) {
      masked[field] = maskEmail(String(value), options) as any
    } else if (
      fieldStr.includes('phone') ||
      fieldStr.includes('mobile') ||
      fieldStr.includes('tel')
    ) {
      masked[field] = maskPhone(String(value), options) as any
    } else {
      // Generic masking for other fields
      const str = String(value)
      const showStart = options.showStart || 2
      const showEnd = options.showEnd || 2
      const maskChar = options.maskChar || '*'

      if (str.length <= showStart + showEnd) {
        masked[field] = (str[0] +
          maskChar.repeat(Math.max(1, str.length - 1))) as any
      } else {
        const visible =
          str.substring(0, showStart) +
          maskChar.repeat(str.length - showStart - showEnd) +
          str.substring(str.length - showEnd)
        masked[field] = visible as any
      }
    }
  }

  return masked
}

/**
 * Mask PII in an array of objects
 *
 * @param data - Array of objects
 * @param fields - Fields to mask
 * @param options - Masking options
 * @returns New array with masked objects
 */
export function maskPIIArray<T extends Record<string, any>>(
  data: T[],
  fields: (keyof T)[],
  options: MaskOptions = {}
): T[] {
  return data.map((item) => maskPII(item, fields, options))
}

/**
 * Check if a value looks like it might contain PII
 * Useful for automatic PII detection
 *
 * @param value - Value to check
 * @returns true if value looks like PII
 */
export function isPotentialPII(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }

  // Check for email pattern
  if (/@.+\..+/.test(value)) {
    return true
  }

  // Check for phone pattern (various formats)
  const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  if (phonePattern.test(value)) {
    return true
  }

  // Check for SSN pattern
  if (/\d{3}-\d{2}-\d{4}/.test(value)) {
    return true
  }

  // Check for credit card pattern
  if (/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/.test(value)) {
    return true
  }

  return false
}

/**
 * Get list of common PII field names
 * Useful for automatic masking
 */
export const COMMON_PII_FIELDS = [
  'email',
  'emailAddress',
  'phone',
  'phoneNumber',
  'mobile',
  'mobileNumber',
  'telephone',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'cardNumber',
  'passport',
  'driverLicense',
  'address',
  'streetAddress',
  'zipCode',
  'postalCode',
] as const

/**
 * Automatically detect and mask PII fields in an object
 *
 * @param data - Object to scan
 * @param options - Masking options
 * @returns New object with PII fields masked
 */
export function autoMaskPII<T extends Record<string, any>>(
  data: T,
  options: MaskOptions = {}
): T {
  const fieldsToMask: (keyof T)[] = []

  // Check field names against common PII fields
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const keyLower = key.toLowerCase()

      // Check if field name matches common PII field
      if (
        COMMON_PII_FIELDS.some((piiField) =>
          keyLower.includes(piiField.toLowerCase())
        )
      ) {
        fieldsToMask.push(key)
      } else if (typeof data[key] === 'string' && isPotentialPII(data[key])) {
        // Check if value looks like PII
        fieldsToMask.push(key)
      }
    }
  }

  return maskPII(data, fieldsToMask, options)
}
