export interface FieldMapping {
  csvField: string
  dbField: string | null
  confidence: number
  required?: boolean
}

export interface MappingSuggestion {
  csvField: string
  suggestions: Array<{
    field: string
    confidence: number
    label: string
  }>
}

/**
 * Available database fields for contact import
 */
export const CONTACT_DB_FIELDS = {
  firstName: { label: 'First Name', required: true },
  lastName: { label: 'Last Name', required: true },
  email: { label: 'Email', required: false },
  phone: { label: 'Phone', required: false },
  company: { label: 'Company Name', required: false },
} as const

export type ContactField = keyof typeof CONTACT_DB_FIELDS

/**
 * Generate automatic field mappings based on CSV headers
 */
export function generateFieldMappings(csvHeaders: string[]): FieldMapping[] {
  return csvHeaders.map(header => {
    const lowerHeader = header.toLowerCase().trim()

    // Guess mappings based on common patterns
    let dbField: ContactField | null = null
    let confidence = 0

    // First Name patterns
    if (
      (lowerHeader.includes('first') && lowerHeader.includes('name')) ||
      lowerHeader === 'firstname' ||
      lowerHeader === 'fname'
    ) {
      dbField = 'firstName'
      confidence = 95
    }
    // Last Name patterns
    else if (
      (lowerHeader.includes('last') && lowerHeader.includes('name')) ||
      lowerHeader === 'lastname' ||
      lowerHeader === 'lname' ||
      lowerHeader === 'surname'
    ) {
      dbField = 'lastName'
      confidence = 95
    }
    // Full Name fallback (if no first/last detected)
    else if (
      lowerHeader.includes('name') ||
      lowerHeader === 'name' ||
      lowerHeader === 'full name' ||
      lowerHeader === 'contact name'
    ) {
      // Check if we already have first/last name mappings
      const hasFirstName = csvHeaders.some(h =>
        (h.toLowerCase().includes('first') && h.toLowerCase().includes('name')) ||
        h.toLowerCase() === 'firstname'
      )
      const hasLastName = csvHeaders.some(h =>
        (h.toLowerCase().includes('last') && h.toLowerCase().includes('name')) ||
        h.toLowerCase() === 'lastname'
      )

      if (!hasFirstName) {
        dbField = 'firstName'
        confidence = 80
      }
    }
    // Email patterns
    else if (
      lowerHeader.includes('email') ||
      lowerHeader === 'e-mail' ||
      lowerHeader === 'mail'
    ) {
      dbField = 'email'
      confidence = 95
    }
    // Phone patterns
    else if (
      lowerHeader.includes('phone') ||
      lowerHeader.includes('mobile') ||
      lowerHeader.includes('tel') ||
      lowerHeader === 'cell' ||
      lowerHeader === 'telephone'
    ) {
      dbField = 'phone'
      confidence = 90
    }
    // Company patterns
    else if (
      lowerHeader.includes('company') ||
      lowerHeader.includes('organization') ||
      lowerHeader.includes('org') ||
      lowerHeader === 'business' ||
      lowerHeader === 'employer'
    ) {
      dbField = 'company'
      confidence = 85
    }

    return {
      csvField: header,
      dbField,
      confidence,
      required: dbField ? CONTACT_DB_FIELDS[dbField]?.required : false,
    }
  })
}

/**
 * Get confidence badge color
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'text-green-600 bg-green-50 border-green-200'
  if (confidence >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'High'
  if (confidence >= 70) return 'Medium'
  return 'Low'
}

/**
 * Validate field mappings
 */
export function validateFieldMappings(mappings: FieldMapping[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check required fields
  const hasFirstName = mappings.some(m => m.dbField === 'firstName')
  const hasLastName = mappings.some(m => m.dbField === 'lastName')

  if (!hasFirstName) {
    errors.push('First Name field mapping is required')
  }

  if (!hasLastName) {
    errors.push('Last Name field mapping is required')
  }

  // Check for duplicate mappings
  const dbFields = mappings
    .filter(m => m.dbField)
    .map(m => m.dbField)

  const duplicates = dbFields.filter((field, index) => dbFields.indexOf(field) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate field mappings found: ${duplicates.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}