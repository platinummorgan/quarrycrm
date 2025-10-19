import { z } from 'zod'

// Entity types enum
export enum EntityType {
  CONTACT = 'CONTACT',
  COMPANY = 'COMPANY',
  DEAL = 'DEAL',
}

export type FieldType =
  | 'string'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'url'
  | 'reference'
  | 'array'

export type FieldDefinition = {
  type: FieldType
  required: boolean
  label: string
}

// CSV Processing Schemas
export const csvColumnMappingSchema = z.object({
  csvColumn: z.string(),
  field: z.string(),
  confidence: z.number().min(0).max(1),
  transform: z
    .enum([
      'none',
      'normalize_phone',
      'normalize_email',
      'lowercase',
      'uppercase',
    ])
    .optional(),
  treatAsTag: z.boolean().optional(),
})

export const csvImportConfigSchema = z.object({
  entityType: z.enum(['CONTACT', 'COMPANY', 'DEAL']),
  mappings: z.array(csvColumnMappingSchema),
  skipDuplicates: z.boolean().default(true),
  updateExisting: z.boolean().default(false),
  createMissingCompanies: z.boolean().default(false),
})

export type CsvColumnMapping = z.infer<typeof csvColumnMappingSchema>
export type CsvImportConfig = z.infer<typeof csvImportConfigSchema>

// Field definitions for each entity type
export const ENTITY_FIELDS = {
  [EntityType.CONTACT]: {
    firstName: { type: 'string' as const, required: true, label: 'First Name' },
    lastName: { type: 'string' as const, required: true, label: 'Last Name' },
    email: { type: 'email' as const, required: false, label: 'Email' },
    phone: { type: 'phone' as const, required: false, label: 'Phone' },
    companyId: {
      type: 'reference' as const,
      required: false,
      label: 'Company ID',
    },
    companyName: {
      type: 'string' as const,
      required: false,
      label: 'Company Name',
    },
    ownerId: { type: 'reference' as const, required: false, label: 'Owner ID' },
    tags: { type: 'array' as const, required: false, label: 'Tags' },
  },
  [EntityType.COMPANY]: {
    name: { type: 'string' as const, required: true, label: 'Company Name' },
    website: { type: 'url' as const, required: false, label: 'Website' },
    industry: { type: 'string' as const, required: false, label: 'Industry' },
    description: {
      type: 'string' as const,
      required: false,
      label: 'Description',
    },
    domain: { type: 'string' as const, required: false, label: 'Domain' },
    ownerId: { type: 'reference' as const, required: false, label: 'Owner ID' },
    tags: { type: 'array' as const, required: false, label: 'Tags' },
  },
  [EntityType.DEAL]: {
    title: { type: 'string' as const, required: true, label: 'Deal Title' },
    value: { type: 'number' as const, required: false, label: 'Value' },
    probability: {
      type: 'number' as const,
      required: false,
      label: 'Probability (%)',
    },
    expectedClose: {
      type: 'date' as const,
      required: false,
      label: 'Expected Close Date',
    },
    contactId: {
      type: 'reference' as const,
      required: false,
      label: 'Contact ID',
    },
    contactEmail: {
      type: 'email' as const,
      required: false,
      label: 'Contact Email',
    },
    companyId: {
      type: 'reference' as const,
      required: false,
      label: 'Company ID',
    },
    companyName: {
      type: 'string' as const,
      required: false,
      label: 'Company Name',
    },
    pipelineId: {
      type: 'reference' as const,
      required: false,
      label: 'Pipeline ID',
    },
    stageId: { type: 'reference' as const, required: false, label: 'Stage ID' },
    ownerId: { type: 'reference' as const, required: false, label: 'Owner ID' },
    tags: { type: 'array' as const, required: false, label: 'Tags' },
  },
} as const

// Common column name variations for auto-detection
export const COLUMN_NAME_VARIATIONS = {
  // Contact fields
  firstName: ['first name', 'firstname', 'first_name', 'fname', 'given name'],
  lastName: [
    'last name',
    'lastname',
    'last_name',
    'lname',
    'surname',
    'family name',
  ],
  email: ['email', 'email address', 'e-mail', 'mail'],
  phone: ['phone', 'phone number', 'telephone', 'mobile', 'cell', 'tel'],
  companyName: ['company', 'company name', 'organization', 'org', 'employer'],
  companyId: ['company id', 'company_id', 'org id', 'organization id'],

  // Company fields
  name: ['company name', 'name', 'organization name'],
  website: ['website', 'site', 'url', 'web'],
  industry: ['industry', 'sector', 'category'],
  description: ['description', 'notes', 'comments', 'about'],
  domain: ['domain', 'website domain'],

  // Deal fields
  title: ['deal title', 'title', 'name', 'deal name'],
  value: ['value', 'amount', 'price', 'deal value'],
  probability: ['probability', 'prob', 'chance', 'likelihood'],
  expectedClose: ['expected close', 'close date', 'expected_close', 'due date'],
  contactEmail: ['contact email', 'client email'],
  pipelineId: ['pipeline', 'pipeline id', 'pipeline_id'],
  stageId: ['stage', 'stage id', 'stage_id', 'phase'],

  // Common fields
  ownerId: ['owner', 'owner id', 'owner_id', 'assigned to', 'assignee'],
  tags: ['tags', 'labels', 'categories', 'keywords'],
} as const

// Auto-detect column mappings based on headers
export function autoDetectMappings(
  headers: string[],
  entityType: EntityType
): CsvColumnMapping[] {
  const mappings: CsvColumnMapping[] = []
  const entityFields = ENTITY_FIELDS[entityType]

  headers.forEach((header) => {
    const normalizedHeader = header.toLowerCase().trim()

    // Find the best matching field
    let bestMatch: { field: string; confidence: number } | null = null

    for (const [field, variations] of Object.entries(COLUMN_NAME_VARIATIONS)) {
      if (!(field in entityFields)) continue

      // Exact match gets highest confidence
      const exactMatch = (variations as readonly string[]).includes(
        normalizedHeader
      )
      if (exactMatch) {
        bestMatch = { field, confidence: 1.0 }
        break
      }

      // Partial match gets lower confidence
      const partialMatch = (variations as readonly string[]).find(
        (v) => normalizedHeader.includes(v) || v.includes(normalizedHeader)
      )
      if (partialMatch && (!bestMatch || bestMatch.confidence < 0.8)) {
        bestMatch = { field, confidence: 0.8 }
      }

      // Fuzzy match for common patterns
      if (
        normalizedHeader.includes(field.toLowerCase()) &&
        (!bestMatch || bestMatch.confidence < 0.6)
      ) {
        bestMatch = { field, confidence: 0.6 }
      }
    }

    if (bestMatch) {
      mappings.push({
        csvColumn: header,
        field: bestMatch.field,
        confidence: bestMatch.confidence,
      })
    }
  })

  return mappings
}

// Normalize data based on field type
export function normalizeField(
  field: string,
  value: string,
  entityType: EntityType
): any {
  if (!value || value.trim() === '') return null

  const entityFields = ENTITY_FIELDS[entityType]
  const fieldDef = entityFields[field as keyof typeof entityFields] as
    | FieldDefinition
    | undefined

  if (!fieldDef) return value.trim()

  switch (fieldDef.type) {
    case 'email':
      return normalizeEmail(value)
    case 'phone':
      return normalizePhone(value)
    case 'number':
      const num = parseFloat(value.replace(/[$,]/g, ''))
      return isNaN(num) ? null : num
    case 'date':
      const date = new Date(value)
      return isNaN(date.getTime()) ? null : date
    case 'url':
      try {
        const url = new URL(
          value.startsWith('http') ? value : `https://${value}`
        )
        return url.href
      } catch {
        return null
      }
    case 'array':
      return value
        .split(/[;,]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    default:
      return value.trim()
  }
}

// Normalize email addresses
export function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(trimmed) ? trimmed : null
}

// Normalize phone numbers (basic US format)
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    const clean = digits.slice(1)
    return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`
  }
  return null
}

// Detect potential duplicates
export function detectDuplicates(
  row: Record<string, any>,
  existingRecords: any[],
  entityType: EntityType
): { isDuplicate: boolean; existingId?: string; confidence: number } {
  switch (entityType) {
    case EntityType.CONTACT:
      // Match by email first, then by name
      if (row.email) {
        const existing = existingRecords.find((c) => c.email === row.email)
        if (existing)
          return { isDuplicate: true, existingId: existing.id, confidence: 1.0 }
      }
      if (row.firstName && row.lastName) {
        const existing = existingRecords.find(
          (c) => c.firstName === row.firstName && c.lastName === row.lastName
        )
        if (existing)
          return { isDuplicate: true, existingId: existing.id, confidence: 0.8 }
      }
      break

    case EntityType.COMPANY:
      // Match by name or domain
      if (row.name) {
        const existing = existingRecords.find((c) => c.name === row.name)
        if (existing)
          return { isDuplicate: true, existingId: existing.id, confidence: 1.0 }
      }
      if (row.domain) {
        const existing = existingRecords.find((c) => c.domain === row.domain)
        if (existing)
          return { isDuplicate: true, existingId: existing.id, confidence: 0.9 }
      }
      break

    case EntityType.DEAL:
      // Match by title
      if (row.title) {
        const existing = existingRecords.find((d) => d.title === row.title)
        if (existing)
          return { isDuplicate: true, existingId: existing.id, confidence: 0.9 }
      }
      break
  }

  return { isDuplicate: false, confidence: 0 }
}

// Validate a row of data
export function validateRow(
  row: Record<string, any>,
  entityType: EntityType
): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const entityFields = ENTITY_FIELDS[entityType]

  // Check required fields
  for (const [field, def] of Object.entries(entityFields)) {
    if (def.required && (!row[field] || row[field].toString().trim() === '')) {
      errors.push(`${def.label} is required`)
    }
  }

  // Validate field types
  for (const [field, value] of Object.entries(row)) {
    if (!value || value.toString().trim() === '') continue

    const fieldDef = entityFields[field as keyof typeof entityFields] as
      | FieldDefinition
      | undefined
    if (!fieldDef) continue

    switch (fieldDef.type) {
      case 'email':
        if (!normalizeEmail(value)) {
          errors.push(`Invalid email format for ${fieldDef.label}`)
        }
        break
      case 'phone':
        if (!normalizePhone(value)) {
          errors.push(`Invalid phone format for ${fieldDef.label}`)
        }
        break
      case 'number':
        if (isNaN(parseFloat(value))) {
          errors.push(`Invalid number format for ${fieldDef.label}`)
        }
        break
      case 'date':
        if (isNaN(new Date(value).getTime())) {
          errors.push(`Invalid date format for ${fieldDef.label}`)
        }
        break
    }
  }

  return { isValid: errors.length === 0, errors }
}
