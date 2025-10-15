import { z } from 'zod'

export interface ValidationError {
  row: number
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface CSVRow {
  [key: string]: string
}

// Zod schema for contact validation
export const contactValidationSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  companyName: z.string().optional(),
})

export type ValidatedContact = z.infer<typeof contactValidationSchema>

/**
 * Validate a single row of CSV data
 */
export function validateContactRow(
  row: CSVRow,
  mappings: Array<{ csvField: string; dbField: string | null }>,
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = []

  // Map CSV fields to database fields
  const contactData: Record<string, string> = {}

  for (const mapping of mappings) {
    if (mapping.dbField) {
      const value = row[mapping.csvField]?.trim()
      if (value) {
        contactData[mapping.dbField] = value
      }
    }
  }

  // Validate using Zod schema
  const validationResult = contactValidationSchema.safeParse(contactData)

  if (!validationResult.success) {
    for (const error of validationResult.error.errors) {
      errors.push({
        row: rowIndex,
        field: error.path[0] as string,
        message: error.message,
        severity: 'error',
      })
    }
  }

  // Additional custom validations
  const email = contactData.email
  if (email) {
    // Check for duplicate @ symbols
    const atCount = (email.match(/@/g) || []).length
    if (atCount > 1) {
      errors.push({
        row: rowIndex,
        field: 'email',
        message: 'Email contains multiple @ symbols',
        severity: 'error',
      })
    }

    // Check for common typos
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      errors.push({
        row: rowIndex,
        field: 'email',
        message: 'Invalid email format',
        severity: 'error',
      })
    }
  }

  const phone = contactData.phone
  if (phone) {
    // Basic phone validation (allow various formats)
    const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{7,20}$/
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      errors.push({
        row: rowIndex,
        field: 'phone',
        message: 'Invalid phone number format',
        severity: 'warning',
      })
    }
  }

  return errors
}

/**
 * Validate multiple rows of CSV data
 */
export function validateContactData(
  data: CSVRow[],
  mappings: Array<{ csvField: string; dbField: string | null }>,
  maxPreviewRows: number = 25
): {
  errors: ValidationError[]
  hasErrors: boolean
  hasWarnings: boolean
} {
  const errors: ValidationError[] = []
  const previewData = data.slice(0, maxPreviewRows)

  previewData.forEach((row, index) => {
    const rowErrors = validateContactRow(row, mappings, index + 1)
    errors.push(...rowErrors)
  })

  return {
    errors,
    hasErrors: errors.some(e => e.severity === 'error'),
    hasWarnings: errors.some(e => e.severity === 'warning'),
  }
}

/**
 * Get validation summary
 */
export function getValidationSummary(errors: ValidationError[]): {
  totalErrors: number
  totalWarnings: number
  errorsByField: Record<string, number>
} {
  const totalErrors = errors.filter(e => e.severity === 'error').length
  const totalWarnings = errors.filter(e => e.severity === 'warning').length

  const errorsByField: Record<string, number> = {}
  errors.forEach(error => {
    errorsByField[error.field] = (errorsByField[error.field] || 0) + 1
  })

  return {
    totalErrors,
    totalWarnings,
    errorsByField,
  }
}