/**
 * PII Masking Unit Tests
 *
 * Tests for email/phone masking utilities and transformers
 */

import { describe, it, expect } from 'vitest'
import {
  maskEmail,
  maskPhone,
  maskPII,
  isDemoUser,
  maskPIIFields,
  maskPIIArray,
  isRequestFromDemo,
  maskContactData,
  maskCompanyData,
} from '@/lib/mask-pii'

describe('Email Masking', () => {
  it('should mask standard email addresses', () => {
    expect(maskEmail('mike.smith@example.com')).toBe('m***@example.com')
    expect(maskEmail('john@example.com')).toBe('j***@example.com')
    expect(maskEmail('jane.doe@company.org')).toBe('j***@company.org')
  })

  it('should handle single character local part', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com')
    expect(maskEmail('x@test.com')).toBe('x***@test.com')
  })

  it('should handle very long local parts', () => {
    expect(maskEmail('very.long.email.address@example.com')).toBe(
      'v***@example.com'
    )
    expect(maskEmail('firstname.middlename.lastname@company.com')).toBe(
      'f***@company.com'
    )
  })

  it('should handle null and undefined', () => {
    expect(maskEmail(null)).toBe('')
    expect(maskEmail(undefined)).toBe('')
  })

  it('should handle empty string', () => {
    expect(maskEmail('')).toBe('')
  })

  it('should return invalid emails as-is', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email')
    expect(maskEmail('missing-at-sign.com')).toBe('missing-at-sign.com')
  })

  it('should handle emails with subdomains', () => {
    expect(maskEmail('user@mail.company.com')).toBe('u***@mail.company.com')
    expect(maskEmail('admin@internal.corp.example.org')).toBe(
      'a***@internal.corp.example.org'
    )
  })
})

describe('Phone Masking', () => {
  it('should mask formatted phone numbers', () => {
    expect(maskPhone('(404) 555-9231')).toBe('***-***-9231')
    expect(maskPhone('404-555-9231')).toBe('***-***-9231')
    expect(maskPhone('404.555.9231')).toBe('***-***-9231')
  })

  it('should mask international phone numbers', () => {
    expect(maskPhone('+1 (404) 555-9231')).toBe('***-***-9231')
    expect(maskPhone('+44 20 1234 5678')).toBe('***-***-9231')
    expect(maskPhone('+1-404-555-9231')).toBe('***-***-9231')
  })

  it('should mask unformatted phone numbers', () => {
    expect(maskPhone('4045559231')).toBe('***-***-9231')
    expect(maskPhone('14045559231')).toBe('***-***-9231')
  })

  it('should handle null and undefined', () => {
    expect(maskPhone(null)).toBe('')
    expect(maskPhone(undefined)).toBe('')
  })

  it('should handle empty string', () => {
    expect(maskPhone('')).toBe('')
  })

  it('should return non-phone strings as-is', () => {
    expect(maskPhone('not a phone')).toBe('not a phone')
    expect(maskPhone('abc')).toBe('abc')
  })

  it('should handle phone with spaces', () => {
    expect(maskPhone('404 555 9231')).toBe('***-***-9231')
    expect(maskPhone('(404) 555 9231')).toBe('***-***-9231')
  })
})

describe('Generic PII Masking', () => {
  it('should detect and mask email addresses', () => {
    expect(maskPII('john.doe@example.com')).toBe('j***@example.com')
    expect(maskPII('admin@company.org')).toBe('a***@company.org')
  })

  it('should detect and mask phone numbers', () => {
    expect(maskPII('(404) 555-9231')).toBe('***-***-9231')
    expect(maskPII('404-555-9231')).toBe('***-***-9231')
  })

  it('should mask other strings with default pattern', () => {
    expect(maskPII('sensitive')).toBe('s*******e')
    expect(maskPII('data')).toBe('d**a')
    expect(maskPII('ab')).toBe('ab')
    expect(maskPII('x')).toBe('*')
  })

  it('should handle null and undefined', () => {
    expect(maskPII(null)).toBe('')
    expect(maskPII(undefined)).toBe('')
  })
})

describe('Demo User Detection', () => {
  it('should detect DEMO role', () => {
    expect(isDemoUser('DEMO')).toBe(true)
    expect(isDemoUser('DEMO', null, null)).toBe(true)
  })

  it('should detect demo organization match', () => {
    const demoOrgId = 'demo-org-123'
    expect(isDemoUser(null, demoOrgId, demoOrgId)).toBe(true)
    expect(isDemoUser('MEMBER', demoOrgId, demoOrgId)).toBe(true)
  })

  it('should return false for non-demo users', () => {
    expect(isDemoUser('ADMIN')).toBe(false)
    expect(isDemoUser('MEMBER')).toBe(false)
    expect(isDemoUser('OWNER')).toBe(false)
  })

  it('should return false when org does not match', () => {
    expect(isDemoUser('MEMBER', 'org-123', 'demo-org-456')).toBe(false)
  })

  it('should handle null values', () => {
    expect(isDemoUser(null, null, null)).toBe(false)
    expect(isDemoUser(undefined, undefined, undefined)).toBe(false)
  })
})

describe('PII Fields Masking', () => {
  it('should mask email field in object', () => {
    const data = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '404-555-9231',
    }

    const masked = maskPIIFields(data, true)
    expect(masked.email).toBe('j***@example.com')
    expect(masked.phone).toBe('***-***-9231')
    expect(masked.name).toBe('John Doe')
    expect(masked.id).toBe('1')
  })

  it('should not mask when isDemo is false', () => {
    const data = {
      email: 'john@example.com',
      phone: '404-555-9231',
    }

    const result = maskPIIFields(data, false)
    expect(result.email).toBe('john@example.com')
    expect(result.phone).toBe('404-555-9231')
  })

  it('should handle custom field names', () => {
    const data = {
      userEmail: 'john@example.com',
      contactPhone: '404-555-9231',
    }

    const masked = maskPIIFields(data, true, ['userEmail', 'contactPhone'])
    expect(masked.userEmail).toBe('j***@example.com')
    expect(masked.contactPhone).toBe('***-***-9231')
  })

  it('should handle missing fields gracefully', () => {
    const data = {
      id: '1',
      name: 'John Doe',
    }

    const masked = maskPIIFields(data, true)
    expect(masked.id).toBe('1')
    expect(masked.name).toBe('John Doe')
  })

  it('should handle null field values', () => {
    const data = {
      email: null,
      phone: null,
    }

    const masked = maskPIIFields(data, true)
    expect(masked.email).toBe(null)
    expect(masked.phone).toBe(null)
  })
})

describe('PII Array Masking', () => {
  it('should mask all items in array', () => {
    const data = [
      { id: '1', email: 'john@example.com', phone: '404-555-9231' },
      { id: '2', email: 'jane@example.com', phone: '404-555-9232' },
    ]

    const masked = maskPIIArray(data, true)
    expect(masked[0].email).toBe('j***@example.com')
    expect(masked[0].phone).toBe('***-***-9231')
    expect(masked[1].email).toBe('j***@example.com')
    expect(masked[1].phone).toBe('***-***-9231')
  })

  it('should not mask when isDemo is false', () => {
    const data = [{ id: '1', email: 'john@example.com', phone: '404-555-9231' }]

    const result = maskPIIArray(data, false)
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].phone).toBe('404-555-9231')
  })

  it('should handle empty array', () => {
    const result = maskPIIArray([], true)
    expect(result).toEqual([])
  })
})

describe('Request Demo Detection', () => {
  it('should detect demo via user.isDemo flag', () => {
    const session = {
      user: { isDemo: true },
    }
    expect(isRequestFromDemo(session)).toBe(true)
  })

  it('should detect demo via currentOrg role', () => {
    const session = {
      user: {
        isDemo: false,
        currentOrg: { role: 'DEMO' },
      },
    }
    expect(isRequestFromDemo(session)).toBe(true)
  })

  it('should detect demo via demoOrgId', () => {
    const session = {
      user: {
        isDemo: false,
        demoOrgId: 'demo-org-123',
      },
    }
    expect(isRequestFromDemo(session)).toBe(true)
  })

  it('should return false for regular users', () => {
    const session = {
      user: {
        isDemo: false,
        currentOrg: { role: 'MEMBER' },
      },
    }
    expect(isRequestFromDemo(session)).toBe(false)
  })

  it('should handle null session', () => {
    expect(isRequestFromDemo(null)).toBe(false)
  })
})

describe('Contact Data Masking', () => {
  it('should mask contact email and phone', () => {
    const contact = {
      id: 'contact-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '(404) 555-9231',
      title: 'CEO',
    }

    const masked = maskContactData(contact, true)
    expect(masked.email).toBe('j***@example.com')
    expect(masked.phone).toBe('***-***-9231')
    expect(masked.firstName).toBe('John')
    expect(masked.lastName).toBe('Doe')
    expect(masked.title).toBe('CEO')
  })

  it('should not mask when isDemo is false', () => {
    const contact = {
      id: 'contact-1',
      email: 'john@example.com',
      phone: '404-555-9231',
    }

    const result = maskContactData(contact, false)
    expect(result.email).toBe('john@example.com')
    expect(result.phone).toBe('404-555-9231')
  })

  it('should handle null email and phone', () => {
    const contact = {
      id: 'contact-1',
      email: null,
      phone: null,
    }

    const masked = maskContactData(contact, true)
    expect(masked.email).toBe(null)
    expect(masked.phone).toBe(null)
  })
})

describe('Company Data Masking', () => {
  it('should mask company email and phone', () => {
    const company = {
      id: 'company-1',
      name: 'Acme Corp',
      email: 'contact@acme.com',
      phone: '(404) 555-1234',
      website: 'acme.com',
    }

    const masked = maskCompanyData(company, true)
    expect(masked.email).toBe('c***@acme.com')
    expect(masked.phone).toBe('***-***-9231')
    expect(masked.name).toBe('Acme Corp')
    expect(masked.website).toBe('acme.com')
  })

  it('should not mask when isDemo is false', () => {
    const company = {
      id: 'company-1',
      email: 'contact@acme.com',
      phone: '404-555-1234',
    }

    const result = maskCompanyData(company, false)
    expect(result.email).toBe('contact@acme.com')
    expect(result.phone).toBe('404-555-1234')
  })
})

describe('Edge Cases', () => {
  it('should handle unicode characters in email', () => {
    expect(maskEmail('ñoño@example.com')).toBe('ñ***@example.com')
  })

  it('should handle special characters in phone', () => {
    expect(maskPhone('+1 (404) 555-9231 ext. 123')).toBe('***-***-9231')
  })

  it('should handle deeply nested objects', () => {
    const data = {
      user: {
        contact: {
          email: 'john@example.com',
        },
      },
    }

    const masked = maskPIIFields(data, true, ['email'])
    // Top level doesn't have email, so it should remain unchanged
    expect(masked.user.contact.email).toBe('john@example.com')
  })

  it('should preserve object references when not masking', () => {
    const data = { email: 'john@example.com' }
    const result = maskPIIFields(data, false)
    expect(result).toBe(data)
  })

  it('should create new object when masking', () => {
    const data = { email: 'john@example.com' }
    const result = maskPIIFields(data, true)
    expect(result).not.toBe(data)
    expect(result.email).toBe('j***@example.com')
  })
})

describe('Integration Scenarios', () => {
  it('should handle complete contact record', () => {
    const contact = {
      id: 'contact-123',
      firstName: 'Mike',
      lastName: 'Smith',
      email: 'mike.smith@example.com',
      phone: '(404) 555-9231',
      title: 'VP of Sales',
      companyId: 'company-456',
      notes: 'Important client',
      createdAt: new Date(),
    }

    const masked = maskContactData(contact, true)
    expect(masked.email).toBe('m***@example.com')
    expect(masked.phone).toBe('***-***-9231')
    expect(masked.firstName).toBe('Mike')
    expect(masked.notes).toBe('Important client')
  })

  it('should handle contact list with mixed data', () => {
    const contacts = [
      { id: '1', email: 'john@example.com', phone: null },
      { id: '2', email: null, phone: '404-555-9231' },
      { id: '3', email: 'jane@example.com', phone: '404-555-9232' },
    ]

    const masked = maskPIIArray(contacts, true)
    expect(masked[0].email).toBe('j***@example.com')
    expect(masked[0].phone).toBe(null)
    expect(masked[1].email).toBe(null)
    expect(masked[1].phone).toBe('***-***-9231')
    expect(masked[2].email).toBe('j***@example.com')
    expect(masked[2].phone).toBe('***-***-9231')
  })

  it('should handle API response structure', () => {
    const response = {
      data: [
        { id: '1', email: 'user1@example.com' },
        { id: '2', email: 'user2@example.com' },
      ],
      total: 2,
      page: 1,
    }

    const masked = {
      ...response,
      data: maskPIIArray(response.data, true),
    }

    expect(masked.data[0].email).toBe('u***@example.com')
    expect(masked.data[1].email).toBe('u***@example.com')
    expect(masked.total).toBe(2)
    expect(masked.page).toBe(1)
  })
})
