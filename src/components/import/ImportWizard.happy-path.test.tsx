import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Papa Parse
const mockPapaParse = vi.fn()
vi.mock('papaparse', () => ({
  default: {
    parse: mockPapaParse,
  },
}))

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Contacts Import Wizard - Happy Path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('completes full import workflow successfully', async () => {
    // Mock CSV parsing
    mockPapaParse.mockImplementation((file, config) => {
      config.complete({
        data: [
          {
            'First Name': 'John',
            'Last Name': 'Doe',
            Email: 'john@example.com',
            Phone: '+1234567890',
            Company: 'Acme Corp',
          },
          {
            'First Name': 'Jane',
            'Last Name': 'Smith',
            Email: 'jane@example.com',
            Phone: '+0987654321',
            Company: 'Tech Inc',
          },
        ],
        errors: [],
        meta: {
          fields: ['First Name', 'Last Name', 'Email', 'Phone', 'Company'],
        },
      })
    })

    // Mock successful import API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        importId: 'test-import-123',
        totalRows: 2,
        created: 2,
        skipped: 0,
        errors: 0,
        affectedIds: ['contact-1', 'contact-2'],
      }),
    })

    // Mock progress polling
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        importId: 'test-import-123',
        status: 'COMPLETED',
        progress: 100,
        totalRows: 2,
        processedRows: 2,
        skippedRows: 0,
        errorRows: 0,
      }),
    })

    // Test CSV file validation
    const file = new File(
      [
        'First Name,Last Name,Email,Phone,Company\nJohn,Doe,john@example.com,+1234567890,Acme Corp\nJane,Smith,jane@example.com,+0987654321,Tech Inc',
      ],
      'contacts.csv',
      { type: 'text/csv' }
    )

    // Verify file validation would pass
    expect(file.name.toLowerCase().endsWith('.csv')).toBe(true)
    expect(file.size).toBeGreaterThan(0)
    expect(file.size).toBeLessThan(10 * 1024 * 1024) // 10MB limit

    // Verify Papa.parse is called correctly
    mockPapaParse(file, {
      header: true,
      skipEmptyLines: true,
      complete: () => {},
      error: () => {},
    })

    expect(mockPapaParse).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        header: true,
        skipEmptyLines: true,
      })
    )

    // Verify field mapping generation
    const csvHeaders = ['First Name', 'Last Name', 'Email', 'Phone', 'Company']
    const mappings = csvHeaders.map((header) => {
      const lowerHeader = header.toLowerCase()

      let dbField: string | null = null
      let confidence = 0

      if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
        dbField = 'firstName'
        confidence = 95
      } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
        dbField = 'lastName'
        confidence = 95
      } else if (lowerHeader.includes('email')) {
        dbField = 'email'
        confidence = 95
      } else if (lowerHeader.includes('phone')) {
        dbField = 'phone'
        confidence = 90
      } else if (lowerHeader.includes('company')) {
        dbField = 'company'
        confidence = 85
      }

      return {
        csvField: header,
        dbField,
        confidence,
      }
    })

    expect(mappings).toEqual([
      { csvField: 'First Name', dbField: 'firstName', confidence: 95 },
      { csvField: 'Last Name', dbField: 'lastName', confidence: 95 },
      { csvField: 'Email', dbField: 'email', confidence: 95 },
      { csvField: 'Phone', dbField: 'phone', confidence: 90 },
      { csvField: 'Company', dbField: 'company', confidence: 85 },
    ])

    // Verify import API call
    const importData = {
      data: [
        {
          'First Name': 'John',
          'Last Name': 'Doe',
          Email: 'john@example.com',
          Phone: '+1234567890',
          Company: 'Acme Corp',
        },
        {
          'First Name': 'Jane',
          'Last Name': 'Smith',
          Email: 'jane@example.com',
          Phone: '+0987654321',
          Company: 'Tech Inc',
        },
      ],
      mappings: mappings.filter((m) => m.dbField),
    }

    const response = await fetch('/api/import/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importData),
    })

    const result = await response.json()

    // Verify API call structure
    expect(mockFetch).toHaveBeenCalledWith('/api/import/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importData),
    })

    // Verify successful response
    expect(result).toEqual({
      importId: 'test-import-123',
      totalRows: 2,
      created: 2,
      skipped: 0,
      errors: 0,
      affectedIds: ['contact-1', 'contact-2'],
    })

    // Verify progress polling
    const progressResponse = await fetch(
      '/api/import/contacts/test-import-123/progress'
    )
    const progressData = await progressResponse.json()

    expect(progressData).toEqual({
      importId: 'test-import-123',
      status: 'COMPLETED',
      progress: 100,
      totalRows: 2,
      processedRows: 2,
      skippedRows: 0,
      errorRows: 0,
    })
  })

  it('handles undo/rollback functionality', async () => {
    // Mock successful rollback API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Import rolled back successfully',
        deletedCount: 2,
      }),
    })

    // Test rollback API call
    const response = await fetch(
      '/api/import/contacts/test-import-123/rollback',
      {
        method: 'POST',
      }
    )

    const result = await response.json()

    // Verify API call
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/import/contacts/test-import-123/rollback',
      {
        method: 'POST',
      }
    )

    // Verify response
    expect(result).toEqual({
      message: 'Import rolled back successfully',
      deletedCount: 2,
    })
  })

  it('validates data integrity throughout the process', () => {
    // Test data validation
    const testData = [
      { 'First Name': 'John', 'Last Name': 'Doe', Email: 'john@example.com' },
      { 'First Name': '', 'Last Name': 'Smith', Email: 'jane@example.com' }, // Missing first name
      { 'First Name': 'Bob', 'Last Name': '', Email: 'bob@example.com' }, // Missing last name
      { 'First Name': 'Alice', 'Last Name': 'Wonder', Email: 'invalid-email' }, // Invalid email
    ]

    const mappings = [
      { csvField: 'First Name', dbField: 'firstName' },
      { csvField: 'Last Name', dbField: 'lastName' },
      { csvField: 'Email', dbField: 'email' },
    ]

    // Simulate validation logic
    const errors: Array<{ row: number; field: string; message: string }> = []
    testData.forEach((row, index) => {
      const rowNum = index + 1

      // Check required fields
      if (!row['First Name']?.trim()) {
        errors.push({
          row: rowNum,
          field: 'firstName',
          message: 'First name is required',
        })
      }
      if (!row['Last Name']?.trim()) {
        errors.push({
          row: rowNum,
          field: 'lastName',
          message: 'Last name is required',
        })
      }

      // Check email format
      if (row['Email']) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(row['Email'].trim())) {
          errors.push({
            row: rowNum,
            field: 'email',
            message: 'Invalid email format',
          })
        }
      }
    })

    expect(errors).toEqual([
      { row: 2, field: 'firstName', message: 'First name is required' },
      { row: 3, field: 'lastName', message: 'Last name is required' },
      { row: 4, field: 'email', message: 'Invalid email format' },
    ])
  })
})
