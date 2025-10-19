import Papa from 'papaparse'

export interface CSVRow {
  [key: string]: string
}

export interface ParseResult {
  data: CSVRow[]
  headers: string[]
  errors: Papa.ParseError[]
}

/**
 * Parse CSV file and extract headers and sample data
 */
export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing failed: ${results.errors[0].message}`))
          return
        }

        resolve({
          data: results.data,
          headers: results.meta.fields || [],
          errors: results.errors,
        })
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`))
      },
    })
  })
}

/**
 * Validate CSV file constraints
 */
export function validateCSVFile(file: File): {
  valid: boolean
  error?: string
} {
  // Check file type
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { valid: false, error: 'File must be a CSV file' }
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' }
  }

  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: 'File cannot be empty' }
  }

  return { valid: true }
}
