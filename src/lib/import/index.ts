// CSV parsing utilities
export type { CSVRow, ParseResult } from './csv-parser'
export { parseCSV, validateCSVFile } from './csv-parser'

// Field mapping utilities
export type { FieldMapping, MappingSuggestion } from './field-mapping'
export {
  CONTACT_DB_FIELDS,
  generateFieldMappings,
  getConfidenceColor,
  getConfidenceLabel,
  validateFieldMappings
} from './field-mapping'

// Validation utilities
export type { ValidationError, ValidatedContact } from './validation'
export {
  contactValidationSchema,
  validateContactRow,
  validateContactData,
  getValidationSummary
} from './validation'

// Re-export Papa Parse for convenience
export { default as Papa } from 'papaparse'